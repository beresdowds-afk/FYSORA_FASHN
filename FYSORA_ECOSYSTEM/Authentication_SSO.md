# FYSORA Authentication & SSO Implementation Prompt

## Unified Identity System
Create a single ecosystem identity system where a user registering on **any** of the three PWAs automatically receives a FYSORA FASHN ecosystem account.

All accounts shall share:
- User ID
- Email
- Phone Number
- Authentication Credentials (hashed passwords, etc.)
- Membership Status
- Subscription Status
- Permissions
- Verification Status

## Single Sign-On (SSO)
Implement SSO so that a user can log in once and access all three applications without re-entering credentials.

- Shared session management across subdomains (e.g., `*.fs-africa.org.ng`).
- Shared authentication endpoints (login, logout, password reset, profile updates) hosted on FYSORA FASHN.
- Session tokens (JWT) issued with appropriate claims (user ID, roles, permissions) and refreshed automatically.

## Mandatory User Notices
Before account creation on **iFYSORA**, display:

> *"By creating an account on iFYSORA, you are also creating a FYSORA FASHN ecosystem account. Your credentials, profile information, and measurement records may be available across FYSORA services according to our Terms of Service and Privacy Policy."*

Require explicit acceptance.

Before account creation on **FYSORA Companion**, display:

> *"By creating an account on FYSORA Companion, you are also creating a FYSORA FASHN ecosystem account, which serves as the central account for all FYSORA services."*

Require explicit acceptance.

## Account Registration Flows
1. **User submits registration** on any PWA.
2. The PWA forwards the registration request to the FYSORA FASHN identity endpoint.
3. FYSORA FASHN creates the account (if not existing), sends verification emails/SMS, and returns an authentication token.
4. The PWA stores the token and redirects the user to the appropriate dashboard.

## Authentication API
Endpoints (protected by rate limiting) on FYSORA FASHN:

- `POST /api/auth/register` – creates ecosystem account.
- `POST /api/auth/login` – authenticates and returns JWT + refresh token.
- `POST /api/auth/refresh` – refreshes JWT.
- `POST /api/auth/logout` – invalidates session.
- `POST /api/auth/password-reset` – initiates reset.
- `PUT /api/auth/password` – updates password (authenticated).
- `GET /api/auth/profile` – returns user profile.
- `PUT /api/auth/profile` – updates profile (email, phone, etc.) with validation.

All endpoints must verify that the requesting application is part of the ecosystem (via API key or client ID) and enforce the same policies.

## Security Measures
- **JWT** with short expiry (15-30 min) and refresh tokens (7 days, stored in HTTP-only secure cookies or mobile secure storage).
- **Role-Based Access Control** – each token contains roles; endpoints validate permissions.
- **Multi-factor authentication** (MFA) – optional but supported (TOTP, SMS).
- **Rate limiting** per user/IP to prevent abuse.
- **Audit logging** for all authentication events.

## Session Synchronization
- Session state is managed centrally at FYSORA FASHN.
- When a user logs out from one application, sessions in all others are invalidated via a logout webhook or by checking token validity against a central revocation list.
- Password reset updates the user's credential and invalidates all active tokens.

## Cross-Origin Considerations
- Use CORS policies that allow requests from the three approved domains.
- CSRF protection (e.g., CSRF tokens, SameSite cookies).

---

## Related Documents
- [Ecosystem Governance](Ecosystem_Governance.md) — the authority model that SSO enforces.
- [API Synchronization](API_Synchronization.md) — token validation and identity propagation across services.
- [Commercialization & Subscription](Commercialization_Subscription.md) — subscription entitlements resolved at the identity layer.
- [Back to Index](index.md)
