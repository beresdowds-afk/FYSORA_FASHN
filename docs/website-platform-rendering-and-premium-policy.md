Website Editor Resolution & Public Website Management Policy

Purpose

This document defines the architecture, rendering behavior, routing rules, entitlement rules, and recovery requirements for the FYSORA FASHN Website Builder.

The objective is to ensure that every Organization and Designer can reliably access and manage their website editor when entitled, while preventing rendering failures, routing conflicts, incorrect hostname resolution, and cross-tenant data leakage.

---

Scope

This policy applies to:

- Organization Websites
- Designer Websites
- Native Platform Websites
- External / Non-Native Websites
- Website Builder
- Website Editor
- Public Website Routing
- Tenant Hostname Resolution
- Custom Domain Resolution
- Premium Website Services

---

Website Types

The platform shall support two website categories.

1. Native Platform Website

A native website is fully hosted by the FYSORA FASHN platform.

Examples:

- https://fs-africa.org.ng/site/{organization-slug}
- https://fs-africa.org.ng/designer/{designer-slug}

These websites are rendered entirely by the platform Website Builder.

Features include:

- Catalogue
- Booking
- Tailors
- AI Services
- Payment Integration
- Communication
- Portfolio
- Organization Profile
- SEO Metadata

---

2. Non-Native Website

A non-native website is externally hosted.

Examples:

- https://gabulkfashionstudio.org.ng
- https://designerbrand.com

The platform stores the public URL and may optionally synchronize data with the external website.

The Website Builder should continue to manage metadata and integrations unless disabled by the owner.

---

Premium Service Policy

Website Builder is a premium platform service.

Access shall only be granted when at least one of the following conditions is true:

- Premium subscription is active.
- Enterprise subscription is active.
- Promotional exemption exists.
- Administrative exemption exists.
- Legacy grandfathered entitlement exists.
- Platform-approved sponsorship exists.

Organizations or Designers without entitlement shall not lose existing website data.

Instead:

- Website editing shall be disabled.
- Public website availability shall remain configurable according to subscription policy.
- Users shall be informed how to upgrade or request an exemption.

---

Website Request Workflow

Organizations and Designers may request website services through:

- Organization Dashboard
- Designer Dashboard
- Premium Features Portal
- Administrative Approval
- Platform Promotions

The workflow must support:

Pending

↓

Review

↓

Approval

↓

Provision Website

↓

Activate Website Builder

↓

Publish Website

---

Rendering Requirements

The Website Editor must never fail because of:

- missing optional fields
- invalid templates
- missing images
- empty catalogues
- missing officers
- missing tailors
- missing social links
- missing branding assets

Default values shall always be used where appropriate.

---

Rendering Recovery

If rendering fails:

The platform shall:

1. Log the exception.

2. Identify the failing component.

3. Continue rendering unaffected sections.

4. Display meaningful fallback content.

5. Never present a blank page.

Error Boundaries shall isolate:

- Hero
- Catalogue
- Navigation
- Footer
- Featured Showcase
- Tailors
- Booking
- Contact Section

---

Template Resolution

Template resolution must never throw an exception.

If an unknown template is encountered:

Use the default platform template.

Log a warning.

Continue rendering.

---

Public Website Resolution

Each Organization and Designer shall resolve only its own website.

The resolution priority shall be:

1. Verified Custom Domain

Example:

https://gabulkfashionstudio.org.ng

↓

2. Valid Public Website URL

↓

3. Native Platform Website

Example:

https://fs-africa.org.ng/site/{slug}

No tenant shall ever receive another tenant's hostname.

---

Tenant Isolation

Hostname resolution shall always be filtered by:

- Organization ID
- Designer ID
- Verified Hostname

Never perform global hostname selection.

Cross-tenant routing is prohibited.

---

Website Editor Resolution

Website Editor shall validate:

- organization exists
- designer exists
- user permissions
- subscription status
- exemption status
- website record
- template
- branding
- theme
- hostname
- routing

before rendering.

Failures shall not terminate rendering.

---

Database Requirements

Queries must tolerate:

null

empty results

missing optional records

Permission denied errors

Network failures

The Website Editor shall continue rendering using available data.

---

Authentication

Authentication failures shall:

redirect once

preserve destination

avoid redirect loops

restore editing session after login

---

Loading Behaviour

Loading indicators shall always terminate.

Every asynchronous execution path shall eventually complete.

Permanent loading states are prohibited.

---

Native Website Availability

Native websites shall remain publicly accessible unless:

- unpublished by owner
- disabled by administrator
- suspended for policy reasons

Subscription expiration alone shall not automatically delete website content.

---

Non-Native Website Availability

External websites shall remain linked while:

- hostname is verified
- public URL is valid

If an external website becomes unreachable:

The platform shall automatically fall back to the native platform website whenever available.

---

Website Builder Recovery

If Website Builder configuration becomes invalid:

Automatically repair:

- missing template
- missing branding
- missing colors
- missing fonts
- missing favicon

using platform defaults.

---

Diagnostics

The platform shall log:

Website resolution

Hostname lookup

Template selection

Website rendering

RPC failures

Supabase failures

Routing failures

Permission failures

Subscription validation

Rendering exceptions

Logs shall include sufficient information to diagnose issues without exposing sensitive user information.

---

Performance

Website rendering should minimize unnecessary network requests, avoid repeated DOM manipulation during render, and load only the resources required for the active page.

---

Regression Protection

Future changes shall not:

- break existing native websites
- break custom domains
- break website editor rendering
- assign incorrect hostnames
- expose another tenant's website
- disable grandfathered website entitlements

---

Final Validation Checklist

Before deployment verify:

- Native organization websites render correctly.
- Native designer websites render correctly.
- External websites resolve correctly.
- Custom domains resolve only to their owning tenant.
- Website Editor opens successfully for entitled users.
- Premium entitlement and exemption rules are enforced.
- Public websites remain available according to platform policy.
- No blank pages occur during rendering failures.
- All routing and rendering logic passes TypeScript compilation and application build validation.
