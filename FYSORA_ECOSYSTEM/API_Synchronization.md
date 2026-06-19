# FYSORA API Synchronization Implementation Prompt

## Communication Architecture
All data synchronization must follow the mandatory path:
- iFYSORA → FYSORA FASHN
- FYSORA Companion → FYSORA FASHN

Direct communication between iFYSORA and FYSORA Companion is **prohibited**. Any information needed across these applications must be routed through FYSORA FASHN.

## API Design Principles
- **Source Systems**: iFYSORA, FYSORA Companion (act as clients).
- **Authority System**: FYSORA FASHN (acts as the API gateway and system of record).
- All writes affecting ecosystem records (users, measurements, orders, etc.) must be validated and stored by FYSORA FASHN before being acknowledged.
- Reads may be served from caches, but the authoritative version is always in FYSORA FASHN.

## API Endpoint Categories

### 1. User & Profile APIs (on FYSORA FASHN)
- `GET /api/users/{userId}` – retrieve user profile.
- `PUT /api/users/{userId}` – update profile (validated and stored).
- `GET /api/users/{userId}/measurements` – list measurements.
- `POST /api/users/{userId}/measurements` – store new measurement (from iFYSORA).
- `PUT /api/users/{userId}/measurements/{measurementId}` – update.
- `DELETE /api/users/{userId}/measurements/{measurementId}` – delete (with permission check).
- `POST /api/users/{userId}/permissions` – grant/revoke sharing permissions.

### 2. Organization & Membership APIs
- `GET /api/organizations` – list organizations (for professional users).
- `POST /api/organizations` – create organization.
- `PUT /api/organizations/{orgId}` – update.
- `GET /api/organizations/{orgId}/members` – list members.
- `POST /api/organizations/{orgId}/members` – invite/register member.

### 3. Commerce & Order APIs
- `GET /api/orders` – list orders.
- `POST /api/orders` – create order (triggers payment).
- `PUT /api/orders/{orderId}` – update order status.
- `GET /api/orders/{orderId}/payments` – list payments.
- `POST /api/orders/{orderId}/payments` – process payment.

### 4. Dispute APIs
- `POST /api/disputes` – file a dispute.
- `GET /api/disputes/{disputeId}` – retrieve details.
- `PUT /api/disputes/{disputeId}` – update status (admin only).
- All dispute workflows must be initiated via FYSORA FASHN.

### 5. Subscription & Plan APIs
- `GET /api/subscriptions/plans` – list available plans.
- `GET /api/subscriptions/current` – get user's subscription.
- `POST /api/subscriptions` – subscribe/change plan.
- `DELETE /api/subscriptions` – cancel subscription.

## Synchronization Flow Example (Measurement)
1. User takes measurements in iFYSORA.
2. iFYSORA calls `POST /api/users/{userId}/measurements` on FYSORA FASHN with the measurement data.
3. FYSORA FASHN validates, stores, and returns a success response with the new measurement ID.
4. FYSORA FASHN may publish a webhook event to notify other services (e.g., Companion) that new measurements are available.
5. Companion, if it needs the measurement, fetches it via `GET /api/users/{userId}/measurements` from FYSORA FASHN.

## Data Integrity & Validation
- All API requests must include a valid JWT with correct scopes.
- Input validation (e.g., measurement units, numeric ranges, required fields) is performed at FYSORA FASHN to ensure data quality.
- Versioning of measurement records (historical snapshots) is maintained.

## Audit Logging
Every API call that modifies state must be logged to an immutable audit log (ELK stack or similar) with:
- Timestamp
- User ID
- Application source (iFYSORA, Companion, or Admin)
- Action type
- Old/New values (for sensitive updates)
- IP address and user agent.

## Webhooks & Event Streaming
Implement outbound webhooks for events:
- User registration/verification
- Measurement creation/update
- Order creation/status change
- Subscription change
- Permission change

This allows microservices to react without polling.

## Caching Strategy
- Use Redis or similar for frequently accessed read-only data (e.g., plan details, public profiles).
- Cache invalidation is triggered by write operations on FYSORA FASHN.
- Cache TTLs are configurable.

## Rate Limiting & Throttling
- Apply per-API-key and per-IP rate limits.
- Return `429 Too Many Requests` with Retry-After header.

## Error Handling
- Use standard HTTP status codes.
- Return structured error responses:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Measurement value out of range",
      "details": { "field": "waist", "value": 120, "max": 100 }
    }
  }
  ```

## Security
- All APIs served over HTTPS.
- JWT validation required for all authenticated endpoints.
- Internal endpoints (e.g., health checks) may use IP whitelisting.
- API keys for application identification (iFYSORA, Companion) with different permission scopes.