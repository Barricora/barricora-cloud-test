# Barricora v80 Roles / View-only Access

This version adds a basic role foundation on top of the real Barricora login.

## Roles

- **Owner**: first registered user, full access and user management.
- **Admin**: can manage users and edit records.
- **Editor**: can create/edit records but cannot manage users.
- **Viewer**: can open/read records only. The API blocks Viewer from POST/PUT/DELETE uploads/changes.

## Deploy

Upload to GitHub and let Cloudflare Pages redeploy.

## SQL

No new SQL is required if `schema_v74_auth.sql` was already run, because the `auth_users` table already has a `role` field.

## Test

1. Log in as your Owner account.
2. Open **Settings > Users / Roles**.
3. Create a test Viewer user.
4. Log in as the Viewer. You should be able to open records, but save/delete/create buttons should be disabled and backend write API requests should be rejected.

Keep Cloudflare Access enabled as the outer protection layer while testing.


V80 update:
- Added visible Log out button in the dashboard cloud panel next to Sync now.
- Sidebar/mobile logout remains available.
- No new SQL required.
