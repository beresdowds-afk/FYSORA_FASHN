Account Integrity Generation Specification

Project: RentMaikar

Subsystem: Account Integrity Framework

Target Platform: Supabase PostgreSQL

Purpose: Generate a complete Account Integrity subsystem capable of auditing, repairing, monitoring, and preventing orphaned records across the RentMaikar platform.

---

Objective

Generate a production-ready Account Integrity module that continuously validates the health of the RentMaikar database.

The generated implementation must:

- Detect orphaned records
- Repair recoverable inconsistencies
- Expose integrity reporting views
- Provide reusable SQL helper functions
- Optimize performance with indexes
- Schedule automatic integrity audits
- Produce administrator-friendly reports
- Support future platform expansion

The implementation must be idempotent, migration-safe, well documented, and compatible with the existing RentMaikar architecture.

---

Generate Directory Structure

Generate the following directory if it does not already exist.

supabase/
└── integrity/
    ├── account_integrity_audit.sql
    ├── account_integrity_repair.sql
    ├── account_integrity_views.sql
    ├── account_integrity_functions.sql
    ├── account_integrity_indexes.sql
    ├── account_integrity_scheduler.sql
    ├── README.md
    └── CHANGELOG.md

Do not remove existing files.

Do not overwrite custom developer code unless explicitly instructed.

---

account_integrity_audit.sql

Generate a read-only audit script.

The audit must detect:

Authentication

- auth.users without profiles
- profiles without auth.users
- duplicate emails
- duplicate phone numbers
- missing user roles
- missing notification preferences
- missing security settings
- missing onboarding records


Drivers

- drivers without profiles
- missing verification records
- missing licenses
- expired verification documents

Vehicle Owners

- owners without profiles

Vehicles

- vehicles without owners
- invalid fleet assignments
- duplicate VINs
- duplicate license plates

Bookings

- orphan reservations
- orphan rentals
- invalid booking references

Payments

- payments without bookings
- refunds without payments
- failed reconciliation

Notifications

- missing notification preferences
- orphan notification records

Documents

- orphan uploaded documents
- invalid ownership references

Marketplace

- published listings without owners
- unavailable vehicles listed as available

Devices

- Traccar device mismatches
- EMQX device mismatches
- Hologram eSIM mismatches


Output must be grouped by severity.

Critical

Warning

Information

The script must never modify data.

---

account_integrity_repair.sql

Generate safe repair procedures.

Permitted repairs include:

Create missing profile

Create missing user role

Create notification preferences

Create security settings

Create onboarding record

Synchronize email

Synchronize timestamps

Synchronize account status

Synchronize preferred language

Synchronize timezone

Rebuild default settings

Repairs must never guess:

Vehicle ownership

Fleet ownership

Payment ownership

Booking ownership

Admin Assistant assignments

Support service assignments

Repairs requiring business decisions must be reported instead of executed.

Every repair must be idempotent.

---

account_integrity_views.sql

Generate reporting views.

Required views include:

vw_account_integrity_summary

vw_orphan_accounts

vw_duplicate_users

vw_missing_roles

vw_missing_profiles

vw_missing_notifications

vw_missing_security_settings

vw_vehicle_integrity

vw_driver_integrity

vw_fleet_integrity

vw_payment_integrity

vw_device_integrity

vw_traccar_integrity

vw_emqx_integrity

vw_esim_integrity

vw_marketplace_integrity

Views must contain meaningful column names suitable for an administrator dashboard.

---

account_integrity_functions.sql

Generate reusable PostgreSQL functions.

Functions should include:

audit_account_integrity()

repair_missing_profiles()

repair_missing_roles()

repair_missing_notifications()

repair_missing_security()

repair_missing_onboarding()

repair_default_settings()

calculate_integrity_score()

generate_integrity_report()

log_integrity_event()

Each function must:

Use exception handling

Return meaningful status

Support logging

Be reusable

Be fully documented

---

account_integrity_indexes.sql

Generate indexes supporting:

Integrity scans

Duplicate detection

Foreign key validation

Dashboard reporting

Scheduled jobs

Use IF NOT EXISTS wherever possible.

Avoid duplicate indexes.

Do not remove existing indexes.

Document every index.

---

account_integrity_scheduler.sql

Generate scheduled jobs.

Recommended schedule:

Every 15 minutes

Run audit

Hourly

Run safe repairs

Daily

Generate integrity report

Weekly

Generate health summary

Monthly

Generate executive report

Use pg_cron when available.

If pg_cron is unavailable:

Generate documented alternatives.

---

README.md

Generate complete documentation including:

Purpose

Installation

Deployment

Configuration

Running audits

Running repairs

Viewing reports

Scheduling

Troubleshooting

Admin responsibilities

Security considerations

Rollback guidance

---

CHANGELOG.md

Generate semantic version history.

Initial version:

Version 1.0.0

Include sections for:

Added

Changed

Deprecated

Removed

Fixed

Security

---

Logging Requirements

Every repair must generate an audit log containing:

Timestamp

Correlation ID

User ID

Administrator ID (if applicable)

Action

Status

Duration

Error code

Retry count

Logs must never be deleted automatically.

---

Security Requirements

Only  Admin may execute repairs.

Audit operations may be read-only for authorized operational roles.

Use Row-Level Security where appropriate.

Validate permissions before performing repairs.

Never expose sensitive authentication data.

---

Performance Requirements

The subsystem must:

Avoid table locks where possible

Support large datasets

Use indexed queries

Batch long-running operations

Minimize transaction duration

Remain suitable for scheduled execution in production

---

Compatibility Requirements

The generated implementation must integrate with existing RentMaikar components including:

Supabase Authentication

Profiles

Fleet Management

Vehicle Owners

Drivers

Vehicles

Bookings

Payments

Notifications

Marketplace

Traccar

EMQX

Hologram eSIM

Future platform modules

No existing production tables, triggers, policies, or functions may be removed or replaced without explicit instruction.

---

Expected Outcome

Upon completion, the generated subsystem shall provide:

- Automated integrity auditing
- Safe automated repairs
- Administrator reporting
- Dashboard-ready SQL views
- Performance-optimized indexes
- Scheduled integrity monitoring
- Comprehensive documentation
- Extensible architecture for future platform modules

The generated artifacts must follow PostgreSQL and Supabase best practices, be fully commented, migration-safe, idempotent, and suitable for production deployment within the RentMaikar platform.
