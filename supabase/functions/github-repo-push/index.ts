import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_USER = "beresdowds-afk";
const GITHUB_ORG = "East-forte-fabrications-and-equipments";

// --- GitHub App JWT & Token helpers ---

function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Normalise escaped newlines that may have been stored in env vars
  let normalised = pem.replace(/\\n/g, "\n").trim();
  // Strip PEM headers/footers
  normalised = normalised
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s/g, "");
  
  // Validate base64 characters
  if (!/^[A-Za-z0-9+/=]+$/.test(normalised)) {
    console.error("PEM contains invalid base64 chars. First 40 chars:", normalised.substring(0, 40));
    throw new Error("Private key contains invalid base64 characters after stripping PEM headers");
  }
  
  const binary = atob(normalised);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createGitHubAppJWT(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 600, iss: appId };

  const enc = new TextEncoder();
  const headerB64 = base64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyData = pemToArrayBuffer(privateKeyPem);

  // Try PKCS#8 first, then wrap PKCS#1 → PKCS#8 automatically
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyData,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  } catch {
    // PKCS#1 → PKCS#8 wrapping with proper ASN.1 DER length encoding
    console.log("PKCS#8 import failed, attempting PKCS#1 to PKCS#8 conversion...");
    const pkcs1Bytes = new Uint8Array(keyData);
    
    // Helper to encode ASN.1 DER length
    function derLength(len: number): Uint8Array {
      if (len < 0x80) return new Uint8Array([len]);
      if (len < 0x100) return new Uint8Array([0x81, len]);
      return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
    }
    
    // AlgorithmIdentifier for rsaEncryption
    const algId = new Uint8Array([
      0x30, 0x0d, 0x06, 0x09,
      0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
      0x05, 0x00
    ]);
    
    // version INTEGER 0
    const version = new Uint8Array([0x02, 0x01, 0x00]);
    
    // OCTET STRING wrapping the PKCS#1 key
    const octetTag = new Uint8Array([0x04]);
    const octetLenBytes = derLength(pkcs1Bytes.length);
    
    // Inner content: version + algId + octetString
    const innerLen = version.length + algId.length + octetTag.length + octetLenBytes.length + pkcs1Bytes.length;
    
    // Outer SEQUENCE
    const seqTag = new Uint8Array([0x30]);
    const seqLenBytes = derLength(innerLen);
    
    // Assemble PKCS#8
    const pkcs8 = new Uint8Array(seqTag.length + seqLenBytes.length + innerLen);
    let offset = 0;
    pkcs8.set(seqTag, offset); offset += seqTag.length;
    pkcs8.set(seqLenBytes, offset); offset += seqLenBytes.length;
    pkcs8.set(version, offset); offset += version.length;
    pkcs8.set(algId, offset); offset += algId.length;
    pkcs8.set(octetTag, offset); offset += octetTag.length;
    pkcs8.set(octetLenBytes, offset); offset += octetLenBytes.length;
    pkcs8.set(pkcs1Bytes, offset);
    
    try {
      cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        pkcs8.buffer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
      console.log("PKCS#1 to PKCS#8 conversion successful");
    } catch (e2) {
      console.error("Both PKCS#8 and PKCS#1 import failed:", e2);
      throw new Error("Private key import failed. The key format could not be recognized.");
    }
  }

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    enc.encode(signingInput)
  );

  return `${signingInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

async function getInstallationToken(appJwt: string, installationId: string): Promise<string> {
  // First verify the JWT works by calling /app
  const verifyRes = await fetch("https://api.github.com/app", {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const verifyData = await verifyRes.text();
  console.log(`JWT verification: status=${verifyRes.status}, body=${verifyData.substring(0, 200)}`);

  // List installations to find the correct one
  const listRes = await fetch("https://api.github.com/app/installations", {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const listData = await listRes.text();
  console.log(`Installations list: status=${listRes.status}, body=${listData.substring(0, 500)}`);

  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  console.log(`Requesting installation token from: ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get installation token [${res.status}]: ${err}`);
  }
  const data = await res.json();
  return data.token;
}

/**
 * Resolve per-org GitHub fine-grained token from org_api_keys.
 * Falls back to platform_api_keys (provider='github', key_name='fine_grained_token'),
 * then to env (GITHUB_APP_* or GITHUB_PAT).
 */
async function resolveOrgGithubToken(orgId?: string | null): Promise<{
  token?: string;
  owner_override?: string;
  source: string;
} | null> {
  if (!orgId) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key);
    const { data } = await sb
      .from("org_api_keys")
      .select("key_name, key_value, is_active")
      .eq("org_id", orgId)
      .eq("provider", "github")
      .eq("is_active", true);
    if (!data || data.length === 0) return null;
    const tokenRow = data.find((r: any) => r.key_name === "fine_grained_token");
    const ownerRow = data.find((r: any) => r.key_name === "repo_owner");
    if (!tokenRow?.key_value) return null;
    return {
      token: tokenRow.key_value,
      owner_override: ownerRow?.key_value,
      source: "org_api_keys",
    };
  } catch (e) {
    console.warn("resolveOrgGithubToken failed:", e);
    return null;
  }
}

async function resolvePlatformGithubToken(): Promise<string | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key);
    const { data } = await sb
      .from("platform_api_keys")
      .select("key_value")
      .eq("provider", "github")
      .eq("key_name", "fine_grained_token")
      .eq("is_active", true)
      .maybeSingle();
    return (data as any)?.key_value || null;
  } catch {
    return null;
  }
}

async function getAuthHeaders(orgId?: string | null): Promise<{
  headers: Record<string, string>;
  ownerOverride?: string;
  source: string;
}> {
  // 1. Tenant-scoped fine-grained token (org_admin manages it themselves)
  const orgKey = await resolveOrgGithubToken(orgId);
  if (orgKey?.token) {
    console.log(`Using per-org GitHub fine-grained token for org ${orgId}`);
    return {
      headers: {
        Authorization: `Bearer ${orgKey.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ownerOverride: orgKey.owner_override,
      source: "org_token",
    };
  }

  // 2. Platform-level fine-grained token in platform_api_keys
  //    Prefer a freshly-set GITHUB_PAT env secret over the DB row so an
  //    expired/revoked DB token can be bypassed without a DB write.
  const envPat = Deno.env.get("GITHUB_PAT");
  if (envPat) {
    console.log("Using GITHUB_PAT env secret (overrides platform_api_keys)");
    return {
      headers: {
        Authorization: `Bearer ${envPat}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      source: "env_pat",
    };
  }

  const platformToken = await resolvePlatformGithubToken();
  if (platformToken) {
    console.log("Using platform GitHub fine-grained token from platform_api_keys");
    return {
      headers: {
        Authorization: `Bearer ${platformToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      source: "platform_token",
    };
  }

  // 3. GitHub App / PAT env fallback
  return { headers: await getEnvAuthHeaders(), source: "env" };
}

async function getEnvAuthHeaders(): Promise<Record<string, string>> {
  const appId = Deno.env.get("GITHUB_APP_ID");
  const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");
  const installationId = Deno.env.get("GITHUB_APP_INSTALLATION_ID");

  if (!appId || !privateKey || !installationId) {
    // Fallback to PAT if app credentials not set
    const pat = Deno.env.get("GITHUB_PAT");
    if (!pat) {
      throw new Error("Neither GitHub App credentials nor GITHUB_PAT are configured");
    }
    console.log("Using GITHUB_PAT fallback");
    return {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  console.log(`Generating GitHub App installation token... AppID=${appId}, InstallationID=${installationId}`);
  const jwt = await createGitHubAppJWT(appId, privateKey);
  const token = await getInstallationToken(jwt, installationId);
  console.log("Installation token obtained successfully");

  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, org_name, repo_name, website_content, description, org_id } = body;

    // Auth: accept either the platform service-role key (used by deployment-worker / pg_cron)
    // OR a signed-in org_admin / super_admin JWT for the given org_id.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const isServiceCall = !!token && token === serviceKey;
    if (!isServiceCall) {
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: userRes, error: userErr } = await adminClient.auth.getUser(token);
      if (userErr || !userRes?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isSuper } = await adminClient.rpc("has_role", {
        _user_id: userRes.user.id, _role: "super_admin",
      });
      let allowed = !!isSuper;
      if (!allowed && org_id) {
        const { data: isAdmin } = await adminClient.rpc("is_org_admin", {
          _user_id: userRes.user.id, _org_id: org_id,
        });
        allowed = !!isAdmin;
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden: org_admin or super_admin required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const auth = await getAuthHeaders(org_id);
    const headers = auth.headers;
    const ownerOverride = auth.ownerOverride;

    const sanitizedRepo = (repo_name || org_name || "website")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (action === "create-repo") {
      // If tenant supplies an owner override (their own user/org), create there
      if (ownerOverride) {
        const check = await fetch(`https://api.github.com/repos/${ownerOverride}/${sanitizedRepo}`, { headers });
        if (check.status === 200) {
          return new Response(JSON.stringify({ success: true, repo_url: `https://github.com/${ownerOverride}/${sanitizedRepo}`, message: "Repository already exists under tenant account" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const create = await fetch(`https://api.github.com/user/repos`, {
          method: "POST", headers,
          body: JSON.stringify({ name: sanitizedRepo, description: description || `Tenant website for ${org_name}`, private: false, auto_init: true }),
        });
        if (create.ok) {
          const repo = await create.json();
          return new Response(JSON.stringify({ success: true, repo_url: repo.html_url, repo_full_name: repo.full_name, owner: repo.owner?.login }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      // Check if repo exists under personal account
      const checkPersonal = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${sanitizedRepo}`, { headers });
      if (checkPersonal.status === 200) {
        return new Response(JSON.stringify({ success: true, repo_url: `https://github.com/${GITHUB_USER}/${sanitizedRepo}`, message: "Repository already exists under personal account" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if repo exists under org
      const checkOrg = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}`, { headers });
      if (checkOrg.status === 200) {
        return new Response(JSON.stringify({ success: true, repo_url: `https://github.com/${GITHUB_ORG}/${sanitizedRepo}`, message: "Repository already exists under organization" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try creating under org first
      let createRes = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: sanitizedRepo,
          description: description || `FSA native website for ${org_name}`,
          private: false,
          auto_init: true,
        }),
      });

      // If org fails, fall back to personal account
      if (!createRes.ok) {
        const orgErr = await createRes.text();
        console.log(`Org repo creation failed (${createRes.status}): ${orgErr}, falling back to personal account ${GITHUB_USER}`);
        createRes = await fetch(`https://api.github.com/user/repos`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: sanitizedRepo,
            description: description || `FSA native website for ${org_name}`,
            private: false,
            auto_init: true,
          }),
        });
      }

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(`GitHub create repo failed [${createRes.status}]: ${JSON.stringify(err)}`);
      }

      const repo = await createRes.json();
      return new Response(JSON.stringify({ success: true, repo_url: repo.html_url, repo_full_name: repo.full_name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "push-files") {
      // Determine which account owns the repo
      let repoOwner = GITHUB_USER;
      if (ownerOverride) {
        const checkTenant = await fetch(`https://api.github.com/repos/${ownerOverride}/${sanitizedRepo}`, { headers });
        if (checkTenant.status === 200) {
          repoOwner = ownerOverride;
        }
      }
      if (repoOwner === GITHUB_USER) {
        const checkOwner = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}`, { headers });
        if (checkOwner.status === 200) {
          repoOwner = GITHUB_ORG;
        }
      }

      const files = website_content || [];
      const filesToPush = files.length > 0 ? files : [
        {
          path: "README.md",
          content: `# ${org_name} - FYSORA FASHN (Fashion Stitches Africa)\n\nNatively generated website powered by FYSORA FASHN (Fashion Stitches Africa) platform.\n`,
        },
        {
          path: "index.html",
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${org_name} | FYSORA FASHN (Fashion Stitches Africa)</title>\n</head>\n<body>\n  <h1>${org_name}</h1>\n  <p>Powered by FYSORA FASHN (Fashion Stitches Africa)</p>\n</body>\n</html>\n`,
        },
      ];

      const refRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/ref/heads/main`, { headers });
      if (!refRes.ok) throw new Error(`Failed to get ref: ${refRes.status}`);
      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      const blobShas = [];
      for (const file of filesToPush) {
        const blobRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/blobs`, {
          method: "POST", headers,
          body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
        });
        if (!blobRes.ok) {
          const blobErr = await blobRes.text();
          throw new Error(`Blob creation failed for ${file.path} [${blobRes.status}]: ${blobErr}`);
        }
        const blob = await blobRes.json();
        blobShas.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      const treeRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/trees`, {
        method: "POST", headers,
        body: JSON.stringify({ base_tree: latestCommitSha, tree: blobShas }),
      });
      if (!treeRes.ok) {
        const treeErr = await treeRes.text();
        throw new Error(`Tree creation failed [${treeRes.status}]: ${treeErr}`);
      }
      const tree = await treeRes.json();

      const commitRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/commits`, {
        method: "POST", headers,
        body: JSON.stringify({ message: `Website update for ${org_name}`, tree: tree.sha, parents: [latestCommitSha] }),
      });
      if (!commitRes.ok) {
        const commitErr = await commitRes.text();
        throw new Error(`Commit creation failed [${commitRes.status}]: ${commitErr}`);
      }
      const commit = await commitRes.json();

      const refUpdateRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/refs/heads/main`, {
        method: "PATCH", headers,
        body: JSON.stringify({ sha: commit.sha }),
      });
      if (!refUpdateRes.ok) {
        const refErr = await refUpdateRes.text();
        throw new Error(`Ref update failed [${refUpdateRes.status}]: ${refErr}`);
      }

      return new Response(JSON.stringify({ success: true, commit_sha: commit.sha, message: "Files pushed successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "transfer-repo") {
      const { new_owner } = await req.json().catch(() => ({}));
      const targetOwner = new_owner || GITHUB_ORG;
      const transferRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${sanitizedRepo}/transfer`, {
        method: "POST", headers,
        body: JSON.stringify({ new_owner: targetOwner }),
      });
      if (!transferRes.ok) {
        const err = await transferRes.text();
        throw new Error(`Transfer failed [${transferRes.status}]: ${err}`);
      }
      const result = await transferRes.json();
      return new Response(JSON.stringify({ success: true, new_url: result.html_url, message: `Repository transferred to ${targetOwner}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-repos") {
      const [personalRes, orgRes] = await Promise.all([
        fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`, { headers }),
        fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100&sort=updated`, { headers }),
      ]);
      const personalRepos = personalRes.ok ? await personalRes.json() : [];
      const orgRepos = orgRes.ok ? await orgRes.json() : [];
      const allRepos = [...personalRepos, ...orgRepos];
      return new Response(JSON.stringify({ success: true, repos: allRepos.map((r: any) => ({ name: r.name, url: r.html_url, updated: r.updated_at, owner: r.owner?.login })) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enable-pages") {
      let repoOwner = GITHUB_USER;
      const checkOwner = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}`, { headers });
      if (checkOwner.status === 200) repoOwner = GITHUB_ORG;

      const pagesRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/pages`, {
        method: "POST", headers,
        body: JSON.stringify({ source: { branch: "main", path: "/" } }),
      });

      if (pagesRes.status === 409) {
        const existingPages = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/pages`, { headers });
        const pagesData = await existingPages.json();
        return new Response(JSON.stringify({ success: true, pages_url: pagesData.html_url, message: "GitHub Pages already enabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!pagesRes.ok) {
        const err = await pagesRes.text();
        throw new Error(`Enable Pages failed [${pagesRes.status}]: ${err}`);
      }

      const pagesData = await pagesRes.json();
      return new Response(JSON.stringify({ success: true, pages_url: pagesData.html_url, message: "GitHub Pages enabled successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GitHub repo error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
