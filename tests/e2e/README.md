# E2E Tests

These Playwright tests verify that public catalogue surfaces render branding
and external links correctly when `org_websites_public.public_website_url` is
present.

## Run

```
bunx playwright install chromium
PLAYWRIGHT_BASE_URL=http://localhost:8080 bunx playwright test tests/e2e
```

CI can wire these into a nightly job alongside the daily edge-function checks.