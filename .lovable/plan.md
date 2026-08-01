# Fix: Gabulk "Website" button opens nothing

## What is actually happening

Confirmed by checking the live data and the domain itself:

- Gabulk's website record is set to **custom integration** mode, with its external address set to `https://gabulkfashionstudio.org.ng` (both `webhook_url` and `public_website_url`).
- The dashboard button therefore links to `https://gabulkfashionstudio.org.ng`.
- That domain does **not** host a separate site. Cloudflare answers with a 308 redirect straight back to `https://www.fs-africa.org.ng/site/gabulk-fashion-studio`.
- That page is Gabulk's own FYSORA page, which — because the mode is "custom integration" — does not render the studio website. It renders an interstitial with a "Visit Website" button pointing back at `gabulkfashionstudio.org.ng`.

So the button is a closed circle: domain → FYSORA page → button → domain. The real Gabulk site content is never rendered.

```text
Dashboard "Website"  ->  gabulkfashionstudio.org.ng
                              | Cloudflare 308
                              v
              fs-africa.org.ng/site/gabulk-fashion-studio
                              | mode = custom_integration
                              v
                    "Visit Website" button  --> back to start
```

## Fix

1. **Correct Gabulk's configuration.** The custom domain is an alias of the FYSORA-hosted page, not a separate website. Switch Gabulk's website mode from `custom_integration` to `auto_builder` and clear `webhook_url`, keeping `gabulkfashionstudio.org.ng` as the branded custom hostname. The native page then renders on both `fs-africa.org.ng/site/gabulk-fashion-studio` and the branded domain.

2. **Add a loop guard so this cannot silently recur for any tenant.** In the org website page, before honouring a custom-integration redirect, reject targets that point back at the platform or at this org's own page (platform hosts, the org's own `/site/:slug`, or a hostname registered to the same org). When rejected, render the native site instead of the dead-end interstitial, and log the reason through the existing redirect-failure logger so it surfaces in the alerts panel.

3. **Warn in the builder at save time.** When mode is "custom integration", validate the entered address: block saving a value that resolves to a platform host or to a hostname already registered as this org's own custom domain, with a clear message explaining it would create a redirect loop.

## Technical notes

- Data change: update `public.org_websites` for org `037ade55-eedb-46da-a8fb-3267e0434a8c` (`mode = 'auto_builder'`, `webhook_url = null`). `public_website_url` can stay so outbound links keep using the branded domain.
- Loop guard in `src/pages/OrgWebsite.tsx` around the existing `get_org_website_redirect` call, reusing the scheme-normalisation already there; helper added to `src/lib/publicSiteUrl.ts` (`isSelfReferentialSiteUrl`).
- Builder validation in `src/components/website-builder/WebsiteBuilderTab.tsx`, using the same helper plus the org's rows in `org_custom_hostnames`.
- The platform host list is currently duplicated in `src/App.tsx` and `src/hooks/useCustomHostname.ts`; extract it into one shared constant next to `src/config/tenantHostnames.ts` so the guard and the router agree.

## Out of scope

No Cloudflare DNS or worker changes — the 308 alias is fine once the mode is corrected.