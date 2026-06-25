import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CF_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN') ?? '';
const CF_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID') ?? '';
const CF_API = 'https://api.cloudflare.com/client/v4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function cf(path: string, init: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!CF_TOKEN || !CF_ZONE_ID) {
    return json(500, { error: 'CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID not configured' });
  }

  let payload: any = {};
  try { payload = await req.json(); } catch {}
  const { action, hostname_id, hostname, cf_hostname_id } = payload || {};

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Authn: extract caller from JWT and ensure they are super_admin or org_admin/manager of the row's org.
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData } = await supabase.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (!userId) return json(401, { error: 'Unauthorized' });

  async function canManage(orgId: string): Promise<boolean> {
    const { data: isSuper } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (isSuper) return true;
    const { data: mem } = await supabase
      .from('org_members').select('role').eq('user_id', userId).eq('org_id', orgId).maybeSingle();
    return !!mem && ['org_admin', 'manager'].includes((mem as any).role);
  }

  // Load row (when applicable) to enforce org-scoped permission
  let row: any = null;
  if (hostname_id) {
    const { data, error } = await supabase
      .from('org_custom_hostnames').select('*').eq('id', hostname_id).maybeSingle();
    if (error || !data) return json(404, { error: 'Hostname row not found' });
    row = data;
    if (!(await canManage(row.org_id))) return json(403, { error: 'Forbidden' });
  }

  try {
    if (action === 'create') {
      // Create a CF custom hostname for the row's domain.
      const host = (hostname || row?.hostname || '').toLowerCase().trim();
      if (!host) return json(400, { error: 'hostname is required' });
      const { ok, status, body } = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames`, {
        method: 'POST',
        body: JSON.stringify({
          hostname: host,
          ssl: {
            method: 'txt',
            type: 'dv',
            settings: { min_tls_version: '1.2', http2: 'on' },
            bundle_method: 'ubiquitous',
            wildcard: false,
          },
        }),
      });
      if (!ok) return json(status, { error: 'Cloudflare error', detail: body });
      const result = (body as any).result;
      if (row) {
        await supabase.from('org_custom_hostnames').update({
          cf_hostname_id: result.id,
          cf_status: result.status,
          cf_ssl_status: result.ssl?.status,
          cf_ownership_verification: result.ownership_verification ?? null,
          cf_validation_records: result.ssl?.validation_records ?? result.ssl?.txt_name ? result.ssl : null,
          cf_last_synced_at: new Date().toISOString(),
        }).eq('id', row.id);
      }
      return json(200, { ok: true, result });
    }

    if (action === 'status') {
      const cfId = cf_hostname_id || row?.cf_hostname_id;
      if (!cfId) return json(400, { error: 'cf_hostname_id missing' });
      const { ok, status, body } = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames/${cfId}`);
      if (!ok) return json(status, { error: 'Cloudflare error', detail: body });
      const result = (body as any).result;
      const verified = result.status === 'active' && result.ssl?.status === 'active';
      if (row) {
        await supabase.from('org_custom_hostnames').update({
          cf_status: result.status,
          cf_ssl_status: result.ssl?.status,
          cf_ownership_verification: result.ownership_verification ?? null,
          cf_validation_records: result.ssl ?? null,
          cf_verification_errors: result.verification_errors ?? null,
          cf_last_checked_at: new Date().toISOString(),
          cf_last_synced_at: new Date().toISOString(),
          is_verified: verified ? true : row.is_verified,
        }).eq('id', row.id);
      }
      return json(200, { ok: true, result, verified });
    }

    if (action === 'delete') {
      const cfId = cf_hostname_id || row?.cf_hostname_id;
      if (cfId) {
        await cf(`/zones/${CF_ZONE_ID}/custom_hostnames/${cfId}`, { method: 'DELETE' });
      }
      if (row) {
        await supabase.from('org_custom_hostnames').update({
          cf_hostname_id: null,
          cf_status: null,
          cf_ssl_status: null,
          cf_ownership_verification: null,
          cf_validation_records: null,
          cf_verification_errors: null,
        }).eq('id', row.id);
      }
      return json(200, { ok: true });
    }

    return json(400, { error: 'Unknown action' });
  } catch (e: any) {
    return json(500, { error: e?.message ?? 'Unhandled error' });
  }
});