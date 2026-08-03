# Website Editor Resolution, Rendering & Multi-Tenant Website Policy

**Document Version:** 1.0
**Status:** Engineering Specification
**Priority:** Critical
**Applies To:**
- FYSORA FASHN (Fashion Stitches Africa)
- Organization Dashboard
- Designer Dashboard
- Native Websites
- External (Non-Native) Websites
- Website Builder
- Website Editor
- Public Website Resolution

---

# Purpose

This document defines the architecture, rendering rules, routing policies, entitlement requirements, and recovery procedures for all organization and designer websites within the FYSORA FASHN platform.

The objective is to ensure that every eligible organization or designer can reliably create, edit, publish, and maintain a public website without affecting platform stability.

This specification also addresses the internal rendering issues affecting the Website Editor.

---

# Website Service Classification

Website Builder is a Premium Platform Service.

Website creation, editing, publishing, hosting, custom domains, and public website management are premium capabilities.

Access shall be controlled by:

- Active subscription
- Approved payment exemption
- Administrative entitlement
- Platform promotional access
- Trial rules where applicable

Users without entitlement shall not lose existing websites but shall have editing disabled until entitlement is restored.

---

# Website Types

The platform shall support two website categories.

## 1. Native Platform Website

A native website is fully hosted and rendered by the FYSORA platform.

Example:

https://fs-africa.org.ng/site/{slug}

or

https://fysorafashn.com/site/{slug}

Characteristics:

- Built using the integrated Website Builder
- Managed from the Website Editor
- Hosted by the platform
- Supports themes
- Supports catalogue
- Supports bookings
- Supports AI features
- Supports payments
- Supports analytics
- Supports SEO

---

## 2. Non-Native Website

A non-native website is an externally hosted website.

Examples:

https://gabulkfashionstudio.org.ng

https://designername.com

Characteristics:

- Managed outside FYSORA
- Can be linked to an organization profile
- Can integrate with FYSORA APIs
- Can embed FYSORA catalogue
- Can embed bookings
- Can embed payments
- Can synchronize selected data

---

# Website Resolution Priority

Whenever the platform needs to determine an organization's public website, resolution shall occur in this order.

Priority 1

Verified Primary Custom Hostname

Example

https://gabulkfashionstudio.org.ng

Priority 2

Verified Public Website URL

Example

https://designerbrand.com

Priority 3

Native Platform Website

Example

https://fs-africa.org.ng/site/{slug}

No organization shall ever inherit another organization's hostname.

Hostname resolution must always be organization-specific.

---

# Website Editor Availability

The Website Editor shall be accessible from:

Organization Dashboard

Website Button

Designer Dashboard

Website Button

The editor shall not be available through any unrelated navigation path.

---

# Website Editor Access Rules

Access shall require:

Authenticated user

AND

Ownership or authorized membership

AND

Premium entitlement OR approved exemption

If entitlement is missing:

Display the Premium Upgrade page.

Do not display rendering errors.

Do not crash.

---

# Existing Payment Exemptions

If an organization or designer qualifies under an approved exemption policy:

The Website button shall remain enabled.

The Website Editor shall remain accessible.

No additional payment prompt shall appear.

---

# Rendering Requirements

The Website Editor shall always render.

Rendering failures shall never produce:

Blank pages

Infinite loading

React crashes

White screens

Unhandled exceptions

---

# Rendering Validation

Before rendering:

Validate:

Organization

Designer

Website record

Template

Brand settings

Permissions

Subscription

If any component is missing:

Display a recoverable interface.

Never terminate rendering.

---

# Template Resolution

If template_id is invalid:

Automatically fall back to the platform default template.

Never throw exceptions.

Log a warning.

Continue rendering.

---

# Font Loading

Dynamic font loading shall execute inside useEffect.

No DOM manipulation shall occur during React rendering.

---

# Component Isolation

The following components shall be isolated.

Catalogue

Booking

Featured Showcase

Gallery

Testimonials

Newsletter

Cart

Analytics

Failure of one component shall not stop the Website Editor.

---

# Error Boundaries

All major Website Builder sections shall be protected by Error Boundaries.

Each boundary shall display:

Friendly recovery message

Reload option

Diagnostic information

---

# Database Validation

Validate:

organizations_public

organizations_summary

org_websites_public

org_custom_hostnames

profiles

designer profiles

RPC functions

Failure shall produce recoverable messages.

Never crash rendering.

---

# Hostname Resolution

Hostname lookup must always be filtered by:

Organization ID

or

Designer ID

Never return the first hostname in the table.

Never return another tenant's hostname.

---

# Public Website URL

Public URLs shall always be absolute.

Correct

https://fs-africa.org.ng/site/gabulk-fashion

Incorrect

/site/gabulk-fashion

---

# Native Website Fallback

When no custom hostname exists:

Automatically resolve

https://fs-africa.org.ng/site/{slug}

---

# Custom Domain Validation

Validate:

HTTPS

Verification status

DNS ownership

Primary designation

Inactive domains shall automatically fall back to native hosting.

---

# Website Modes

Supported modes:

Native Builder

Custom Integration

External Website

Embedded Website

Each mode shall render correctly.

---

# Authentication

Authentication failures shall:

Preserve destination

Avoid redirect loops

Return to Website Editor after login

---

# Loading States

Every asynchronous process shall eventually terminate.

Loading indicators shall never remain indefinitely.

---

# Diagnostics

Temporary logging shall include:

Template resolution

Hostname resolution

Permission validation

Premium entitlement

Subscription validation

Website lookup

RPC failures

Supabase errors

Rendering exceptions

---

# Premium Enforcement

Website Builder shall respect:

Subscription rules

Trial rules

Administrative exemptions

Promotional access

Institutional exemptions

Existing grandfathered accounts

---

# Recovery

If rendering fails:

Attempt automatic recovery.

Reload website configuration.

Reload template.

Reload branding.

Retry failed RPCs.

Continue rendering whenever possible.

---

# Regression Protection

Future updates shall not break:

Organization websites

Designer websites

Website Builder

Website Editor

Native websites

External websites

Premium entitlement

Hostname resolution

Routing

Catalogue

Bookings

SEO

Analytics

---

# Completion Criteria

Implementation shall be considered complete only when:

✓ Website button opens correctly from Organization Dashboard.

✓ Website button opens correctly from Designer Dashboard.

✓ Native websites render correctly.

✓ External websites resolve correctly.

✓ Premium entitlement functions correctly.

✓ Payment exemptions function correctly.

✓ Hostname resolution is tenant-specific.

✓ No organization receives another organization's hostname.

✓ No React rendering exceptions occur.

✓ No blank pages occur.

✓ No infinite loading occurs.

✓ TypeScript compiles without errors.

✓ Existing website functionality remains intact.

---

End of Specification
