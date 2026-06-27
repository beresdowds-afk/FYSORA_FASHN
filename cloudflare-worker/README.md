# FYSORA Tenant Rewriter — Cloudflare Worker

Edge-level URL rewriter that lets every tenant custom domain
(e.g. `gabulkfashionstudio.org.ng`) serve the platform's
`/site/:slug` page while keeping the tenant URL visible in the
browser address bar.

## One-time deploy

```bash
cd cloudflare-worker
npx wrangler login                       # interactive
npx wrangler deploy --var PLATFORM_ORIGIN:https://www.fs-africa.org.ng
```

## Adding a new tenant

1. Add the host → slug entry in `src/worker.js` (`TENANT_MAP`) and
   redeploy the Worker.
2. From the FYSORA Super Admin → Custom Hostnames panel, click
   **Provision Worker Route** for the new hostname. This calls the
   `cloudflare-worker-routes` edge function which registers a
   route binding `<hostname>/*` against this Worker via the
   Cloudflare API.
3. Make sure the hostname is also added as a Cloudflare custom
   hostname (handled by the existing `cloudflare-hostname` flow).

## Env vars

- `PLATFORM_ORIGIN` — platform origin to forward to. Defaults to
  `https://www.fs-africa.org.ng`.

## Notes

- Static asset paths (`/assets/*`, files with extensions) and API /
  functions paths bypass the rewrite and are forwarded verbatim.
- The Worker is stateless; mapping changes need a redeploy. A future
  iteration can move the map into Workers KV so updates land without
  redeploys.