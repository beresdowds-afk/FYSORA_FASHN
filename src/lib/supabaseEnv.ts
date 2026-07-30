/**
 * Startup validation for the Supabase (Lovable Cloud) environment.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time. When the `.env` values
 * are missing or malformed at build/publish time the generated client is
 * constructed with `undefined` and every request fails with an opaque
 * "Failed to fetch". This module turns that silent failure into a loud,
 * actionable one at boot.
 */

export interface SupabaseEnvIssue {
  variable: string;
  problem: string;
  fix: string;
}

export interface SupabaseEnvReport {
  ok: boolean;
  issues: SupabaseEnvIssue[];
  projectRef: string | null;
  url: string | null;
}

const PUBLISHABLE_KEY_RE = /^(sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export function inspectSupabaseEnv(
  env: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>,
): SupabaseEnvReport {
  const issues: SupabaseEnvIssue[] = [];
  const url = typeof env.VITE_SUPABASE_URL === "string" ? env.VITE_SUPABASE_URL.trim() : "";
  const key =
    typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === "string"
      ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
      : "";
  const ref =
    typeof env.VITE_SUPABASE_PROJECT_ID === "string" ? env.VITE_SUPABASE_PROJECT_ID.trim() : "";

  if (!url) {
    issues.push({
      variable: "VITE_SUPABASE_URL",
      problem: "missing or empty",
      fix: "Reconnect the backend so the .env values are rewritten, then publish again.",
    });
  } else if (!/^https:\/\/[a-z0-9-]+\.(supabase\.co|lovable\.cloud)(\/)?$/i.test(url)) {
    issues.push({
      variable: "VITE_SUPABASE_URL",
      problem: `malformed value "${url}"`,
      fix: 'Expected a URL like "https://<project-ref>.supabase.co" with no trailing path.',
    });
  }

  if (!key) {
    issues.push({
      variable: "VITE_SUPABASE_PUBLISHABLE_KEY",
      problem: "missing or empty",
      fix: "The publishable (anon) key was not injected at build time. Reconnect the backend and re-publish.",
    });
  } else if (!PUBLISHABLE_KEY_RE.test(key)) {
    issues.push({
      variable: "VITE_SUPABASE_PUBLISHABLE_KEY",
      problem: "malformed value",
      fix: 'Expected a key starting with "sb_publishable_" (current format) or a legacy JWT anon key.',
    });
  }

  if (!ref) {
    issues.push({
      variable: "VITE_SUPABASE_PROJECT_ID",
      problem: "missing or empty",
      fix: "Required for edge-function URLs. Reconnect the backend and re-publish.",
    });
  } else if (url && !url.includes(ref)) {
    issues.push({
      variable: "VITE_SUPABASE_PROJECT_ID",
      problem: `"${ref}" does not match the project in VITE_SUPABASE_URL`,
      fix: "The .env has values from two different backends. Reconnect the backend to resync them.",
    });
  }

  return { ok: issues.length === 0, issues, projectRef: ref || null, url: url || null };
}

export function formatSupabaseEnvError(report: SupabaseEnvReport): string {
  return [
    "FYSORA FASHN could not start: the backend connection is not configured correctly.",
    "",
    ...report.issues.map((i) => `  • ${i.variable} — ${i.problem}\n    → ${i.fix}`),
  ].join("\n");
}

/**
 * Fails fast at boot. Renders a readable message into #root instead of leaving
 * users with a blank screen and a console full of "Failed to fetch".
 */
export function assertSupabaseEnv(): SupabaseEnvReport {
  const report = inspectSupabaseEnv();
  if (report.ok) return report;

  const message = formatSupabaseEnvError(report);
  console.error("[FSA] " + message);

  if (typeof document !== "undefined") {
    const root = document.getElementById("root");
    if (root) {
      const list = report.issues
        .map(
          (i) =>
            `<li style="margin-bottom:12px"><code style="font-weight:600">${i.variable}</code> — ${i.problem}<br/><span style="opacity:.75">${i.fix}</span></li>`,
        )
        .join("");
      root.innerHTML = `<div role="alert" style="max-width:640px;margin:12vh auto;padding:32px;font-family:system-ui,sans-serif;line-height:1.6">
        <h1 style="font-size:20px;margin:0 0 8px">Backend connection not configured</h1>
        <p style="margin:0 0 20px;opacity:.8">The app cannot reach its database because required environment values are missing or malformed at build time.</p>
        <ul style="padding-left:20px;margin:0">${list}</ul>
      </div>`;
    }
  }

  throw new Error(message);
}