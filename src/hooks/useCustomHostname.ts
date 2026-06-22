import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "fsa.custom_hostname.v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface ResolvedHostname {
  org_id: string;
  slug: string;
  name: string;
}

/**
 * Resolves the current window.location.hostname to an organization slug if
 * the hostname is configured as a verified custom hostname in
 * org_custom_hostnames. Caches in sessionStorage for 5 min so we hit the DB
 * at most once per session per host.
 */
export const useCustomHostname = () => {
  const [resolved, setResolved] = useState<ResolvedHostname | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const host = typeof window !== "undefined" ? window.location.hostname : "";

    // Never resolve for known platform hosts to avoid an unnecessary RPC.
    const isPlatformHost =
      !host ||
      host === "localhost" ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovableproject-dev.com") ||
      host === "fs-africa.org.ng" ||
      host === "www.fs-africa.org.ng" ||
      host === "fashionstitchesafrica.lovable.app";

    if (isPlatformHost) {
      setLoading(false);
      return;
    }

    try {
      const raw = sessionStorage.getItem(`${CACHE_KEY}:${host}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.expires_at > Date.now()) {
          setResolved(parsed.value);
          setLoading(false);
          return;
        }
      }
    } catch {}

    (async () => {
      const { data, error } = await supabase
        .rpc("resolve_org_by_hostname", { _host: host });
      if (cancelled) return;
      const value: ResolvedHostname | null = !error && data && data[0] ? data[0] : null;
      setResolved(value);
      setLoading(false);
      try {
        sessionStorage.setItem(
          `${CACHE_KEY}:${host}`,
          JSON.stringify({ value, expires_at: Date.now() + CACHE_TTL_MS })
        );
      } catch {}
    })();

    return () => { cancelled = true; };
  }, []);

  return { resolved, loading };
};
