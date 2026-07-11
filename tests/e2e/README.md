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

## Passkey flow

`passkey-flow.spec.ts` installs a CDP virtual authenticator, enrolls a passkey
in `/account/security`, and verifies the same passkey via the "Test passkey
sign-in" button. Provide credentials for a real test account:

```
PLAYWRIGHT_TEST_EMAIL=you@example.com \
PLAYWRIGHT_TEST_PASSWORD='...' \
PLAYWRIGHT_BASE_URL=http://localhost:8080 \
  bunx playwright test tests/e2e/passkey-flow.spec.ts
```

The virtual authenticator is scoped to the browser context and is torn down
automatically at the end of the run.