# Cloudflare Non-Native Domain Registration for Tenants (Designers & Organizations)

> Reference for programmatic Cloudflare Registrar registrations used when a
> tenant buys a brand-new (non-native) domain through FYSORA FASHN.
> Native `.fs-africa.org.ng` subdomains do NOT use this flow — they are
> served through the existing Cloudflare Worker + custom-hostname pipeline.

---

## Registrations

### Create Registration

**POST** `/accounts/{account_id}/registrar/registrations`

Starts a domain registration workflow. This is a billable operation — successful
registration charges the account's default payment method. All successful
domain registrations are **non-refundable** — once the workflow completes with
`state: succeeded`, the charge cannot be reversed.

#### Prerequisites

- The account must have a billing profile with a valid default payment method.
  Set this up at `https://dash.cloudflare.com/{account_id}/billing/payment-info`.
- The account must not already be at the maximum supported domain limit.
  A single account may own up to **100 domains** in total across registrations
  created through either the dashboard or this API.
- The domain must be on a supported extension for programmatic registration.
- Use `POST /domain-check` immediately before calling this endpoint to confirm
  real-time availability and pricing.

#### Supported extensions

In this API, "extension" means the full registrable suffix after the domain
label. For example, in `example.co.uk`, the extension is `co.uk`.

Programmatic registration is currently supported for:

`com`, `org`, `net`, `app`, `dev`, `cc`, `xyz`, `info`, `cloud`, `studio`,
`live`, `link`, `pro`, `tech`, `fyi`, `shop`, `online`, `tools`, `run`,
`games`, `build`, `systems`, `world`, `news`, `site`, `network`, `chat`,
`space`, `family`, `page`, `life`, `group`, `email`, `solutions`, `day`,
`blog`, `ing`, `icu`, `academy`, `today`

Cloudflare Registrar supports 400+ extensions in the dashboard. Extensions
not listed above can still be registered at
`https://dash.cloudflare.com/{account_id}/domains/registrations`.

#### Express mode

The only required field is `domain_name`. If `contacts` is omitted, the system
uses the account's default address book entry as the registrant. If no default
exists and no contact is provided, the request fails. Set up a default address
book entry and accept the required agreement at
`https://dash.cloudflare.com/{account_id}/domains/registrations`.

#### Defaults

- `years`: defaults to the extension's minimum registration period (1 year for
  most extensions, but varies — for example, `.ai` requires a minimum of 2 years).
- `auto_renew`: defaults to `false`. Setting it to `true` is an explicit
  opt-in authorizing Cloudflare to charge the account's default payment
  method up to 30 days before domain expiry.
- `privacy_mode`: defaults to `redaction`.

#### Premium domains

Premium domain registration is not currently supported by this API.
If `POST /domain-check` returns `tier: premium`, do not call this
endpoint for that domain.

#### Response behavior

By default, the server holds the connection for a bounded, server-defined
amount of time while the registration completes. Most registrations finish
within this window and return `201 Created` with a completed workflow status.

If still processing, the server returns `202 Accepted`. Poll the URL in
`links.self` to track progress. To skip the wait and receive an immediate
`202`, send `Prefer: respond-async`.

#### Body Parameters

- `domain_name: string` — FQDN including the extension (e.g., `mybrand.app`).
  Acts as the natural idempotency key.
- `auto_renew: optional boolean` — defaults to `false`.
- `contacts: optional { registrant }` — omit to use the account default address
  book entry.
  - `registrant.email: string`
  - `registrant.phone: string` — E.164 `+{cc}.{number}`.
  - `registrant.postal_info.address: { city, country_code, postal_code, state, street }`
  - `registrant.postal_info.name: string`
  - `registrant.postal_info.organization: optional string`
  - `registrant.fax: optional string` — E.164.
- `privacy_mode: optional "redaction"` — `off` disables WHOIS privacy.
- `years: optional number` — 1–10, defaults to the registry minimum.

#### Returns

`result: WorkflowStatus` with `state` in
`pending | in_progress | action_required | blocked | succeeded | failed`.

- `succeeded` — terminal, `context.registration` contains the registration.
- `failed` — terminal; surface `error.message`.
- `action_required` — needs user action, break out of polling loops.
- `blocked` — third-party dependency (registry / losing registrar); keep polling.

#### Example

```http
curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/registrar/registrations \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -d '{
          "domain_name": "my-new-startup.com",
          "privacy_mode": "redaction",
          "years": 1
        }'
```

---

### List Registrations

**GET** `/accounts/{account_id}/registrar/registrations`

Cursor-paginated. Query parameters:

- `cursor: optional string` — from previous `result_info.cursor`.
- `direction: "asc" | "desc"` — default `asc`.
- `per_page: optional number`.
- `sort_by: "registry_created_at" | "registry_expires_at" | "name"` — default `registry_created_at`.

Each `Registration` returns: `auto_renew`, `created_at`, `domain_name`,
`expires_at`, `locked`, `privacy_mode`, `status`
(`active | registration_pending | expired | suspended | redemption_period | pending_delete`).

---

### Get Registration

**GET** `/accounts/{account_id}/registrar/registrations/{domain_name}`

Canonical read for a domain. When ready, `created_at` and `expires_at` are both present.

---

### Update Registration

**PATCH** `/accounts/{account_id}/registrar/registrations/{domain_name}`

Updates fields on an existing domain (auto-renew, privacy, lock, etc.).

Response behavior mirrors Create:

- Synchronous wait → `200 OK` with completed workflow status.
- Still processing → `202 Accepted`; poll `links.self`.
- Send `Prefer: respond-async` to skip the wait and receive `202` immediately.

---

## FYSORA Integration Notes

- Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as edge-function
  secrets (never in client code).
- Route all tenant-facing purchase / list / get calls through the existing
  `cloudflare-registrar` edge function so RLS + audit logging apply.
- After a successful registration, persist the mapping into
  `org_custom_hostnames` and provision the Cloudflare Worker route + KV
  entry via `cloudflare-worker-routes` so the domain resolves to the
  tenant's `/site/:slug` page.
- Registrations are **non-refundable** — always call `POST /domain-check`
  first and require an explicit confirmation UI on the tenant side.
