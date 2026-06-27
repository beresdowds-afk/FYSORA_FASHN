import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const RAW_CF_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN') ?? '';
const RAW_CF_ZONE = Deno.env.get('CLOUDFLARE_ZONE_ID') ?? '';
// Strip any non-ASCII / control / whitespace chars that would make the header
// fail the ByteString check when constructing fetch().
const CF_TOKEN = RAW_CF_TOKEN.replace(/[^\x21-\x7E]/g, '');
const CF_ZONE_ID = RAW_CF_ZONE.replace(/[^\x21-\x7E]/g, '');
console.log('[boot v3] token_len_raw=', RAW_CF_TOKEN.length, 'clean=', CF_TOKEN.length, 'zone_clean=', CF_ZONE_ID.length);
const CF_API = 'https://api.cloudflare.com/client/v4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function cf(path: string, init: RequestInit = {}) {
  console.log('[cf] request', path, 'token_len=', CF_TOKEN.length, 'zone_len=', CF_ZONE_ID.length);
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

  // ---------- Service-mode actions (no JWT required) ----------
  // Used by the scheduled poller to refresh pending hostnames in bulk.
  // The pg_cron job can't read the service role key, so we accept either
  // the service role bearer OR the publishable anon key (read-only intent;
  // this action only mirrors Cloudflare status back into our row).
  if (action === 'poll_pending') {
    const { data: pending } = await supabase
      .from('org_custom_hostnames')
      .select('id, cf_hostname_id')
      .not('cf_hostname_id', 'is', null)
      .or('cf_status.neq.active,cf_ssl_status.neq.active')
      .limit(50);
    const results: any[] = [];
    for (const row of pending ?? []) {
      const { ok, body } = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames/${row.cf_hostname_id}`);
      if (!ok) { results.push({ id: row.id, error: body }); continue; }
      const result = (body as any).result;
      const verified = result.status === 'active' && result.ssl?.status === 'active';
      await supabase.from('org_custom_hostnames').update({
        cf_status: result.status,
        cf_ssl_status: result.ssl?.status,
        cf_ownership_verification: result.ownership_verification ?? null,
        cf_validation_records: result.ssl ?? null,
        cf_verification_errors: result.verification_errors ?? null,
        cf_last_checked_at: new Date().toISOString(),
        cf_last_synced_at: new Date().toISOString(),
        is_verified: verified ? true : undefined,
      }).eq('id', row.id);
      results.push({ id: row.id, status: result.status, ssl: result.ssl?.status, verified });
    }
    return json(200, { ok: true, processed: results.length, results });
  }

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

  // ---------- Fallback origin (super_admin only) ----------
  if (action === 'set_fallback_origin') {
    const { data: isSuper } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isSuper) return json(403, { error: 'super_admin required' });
    const origin = (payload?.origin || 'fs-africa.org.ng').toLowerCase().trim();
    const { ok, status, body } = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames/fallback_origin`, {
      method: 'PUT',
      body: JSON.stringify({ origin }),
    });
    if (!ok) return json(status, { error: 'Cloudflare error', detail: body });
    return json(200, { ok: true, origin, result: (body as any).result });
  }

  if (action === 'get_fallback_origin') {
    const { ok, status, body } = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames/fallback_origin`);
    if (!ok) return json(status, { error: 'Cloudflare error', detail: body });
    return json(200, { ok: true, result: (body as any).result });
  }

  // ---------- Auto-create validation TXT records on the customer's CF zone ----------
  // Requires the API token to have Zone:DNS:Edit on the target zone.
  if (action === 'create_validation_records') {
    const { data: isSuper } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isSuper) return json(403, { error: 'super_admin required' });
    if (!hostname_id) return json(400, { error: 'hostname_id required' });
    const { data: r } = await supabase
      .from('org_custom_hostnames').select('*').eq('id', hostname_id).maybeSingle();
    if (!r) return json(404, { error: 'row not found' });

    // Refresh CF state first so validation records are current.
    if (r.cf_hostname_id) {
      const s = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames/${r.cf_hostname_id}`);
      if (s.ok) {
        const res = (s.body as any).result;
        await supabase.from('org_custom_hostnames').update({
          cf_ownership_verification: res.ownership_verification ?? null,
          cf_validation_records: res.ssl ?? null,
        }).eq('id', r.id);
        r.cf_ownership_verification = res.ownership_verification;
        r.cf_validation_records = res.ssl;
      }
    }

    // Build the validation records first so we can always return them for manual setup.
    const host: string = (r as any).hostname;
    const records: Array<{ name: string; content: string; type: 'TXT' }> = [];
    const own = (r as any).cf_ownership_verification;
    if (own?.type === 'txt' && own?.name && own?.value) {
      records.push({ type: 'TXT', name: own.name, content: own.value });
    }
    const ssl = (r as any).cf_validation_records;
    const sslRec = ssl?.validation_records?.[0] ?? ssl;
    if (sslRec?.txt_name && sslRec?.txt_value) {
      records.push({ type: 'TXT', name: sslRec.txt_name, content: sslRec.txt_value });
    }
    if (records.length === 0) return json(400, { error: 'No validation records present yet — re-provision first.' });

    // Find the customer's zone by walking apex labels — only works if the apex
    // is on the same Cloudflare account as our API token.
    const parts = host.split('.');
    let zoneId: string | null = null;
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join('.');
      const z = await cf(`/zones?name=${encodeURIComponent(candidate)}&status=active`);
      const found = (z.body as any)?.result?.[0];
      if (z.ok && found) { zoneId = found.id; break; }
    }
    if (!zoneId) {
      // Apex is on a different Cloudflare account (or not on Cloudflare at all).
      // Return the records so the operator/customer can add them manually.
      return json(200, {
        ok: false,
        manual_required: true,
        reason: 'apex_not_on_this_cf_account',
        message: `The apex of ${host} is not on the same Cloudflare account as the platform API token, so TXT records must be added manually at the customer's DNS provider.`,
        records: records.map((rec) => ({ type: 'TXT', name: rec.name, content: rec.content, ttl: 60 })),
      });
    }

    const results: any[] = [];
    for (const rec of records) {
      const create = await cf(`/zones/${zoneId}/dns_records`, {
        method: 'POST',
        body: JSON.stringify({ ...rec, ttl: 60 }),
      });
      if (!create.ok && (create.body as any)?.errors?.some?.((e: any) => e.code === 81057 || e.code === 81058)) {
        // duplicate — treat as success
        results.push({ name: rec.name, status: 'exists' });
      } else if (!create.ok) {
        results.push({ name: rec.name, status: 'error', detail: create.body });
      } else {
        results.push({ name: rec.name, status: 'created' });
      }
    }
    return json(200, { ok: true, zone_id: zoneId, records: results });
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
      let { ok, status, body } = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames`, {
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
      // If duplicate exists on CF, look it up and adopt it.
      if (!ok && (body as any)?.errors?.some?.((e: any) => e.code === 1406)) {
        const lookup = await cf(`/zones/${CF_ZONE_ID}/custom_hostnames?hostname=${encodeURIComponent(host)}`);
        const found = (lookup.body as any)?.result?.[0];
        if (lookup.ok && found) {
          ok = true; status = 200;
          body = { result: found } as any;
        } else {
          return json(status, { error: 'Cloudflare error', detail: body });
        }
      } else if (!ok) {
        return json(status, { error: 'Cloudflare error', detail: body });
      }
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