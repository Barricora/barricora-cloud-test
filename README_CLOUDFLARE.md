# Barricora v37 Cloud Foundation

This version keeps the v36 app but adds a Cloudflare backend foundation.

## Required Cloudflare bindings

Set these exact binding names in your Cloudflare Pages project:

- D1 database binding: `DB`
- R2 bucket binding: `AUDIT_PHOTOS`

## Database setup

Run the SQL from `schema.sql` in your D1 database.

## Deployment note

Cloudflare Pages Functions are included under `/functions`.
Do not use normal dashboard drag-and-drop direct upload for this backend version.
Deploy using GitHub integration or Wrangler.

## API routes included

- `GET /api/health`
- `GET /api/audits`
- `POST /api/audits`
- `DELETE /api/audits`
- `DELETE /api/audits/:id`
- `GET /api/photos?key=...`

## Behaviour

The app still works locally/browser-only if the API is not available.
When the API is available, it will sync saved audits to D1 and upload photo data to R2.
Existing local audits are not wiped when the cloud database is empty; they are pushed to cloud.

## v38 additions

- Dashboard has a clearer cloud panel.
- Empty action records are removed before saving.
- Test `/api/debug` to confirm bindings. Expected: `{"ok":true,"dbBinding":true,"r2Binding":true,...}`

## v39 settings table

Run `schema_v39_settings.sql` in your D1 database to enable cloud-synced app settings. The app still saves settings locally if this table is not created yet.

New API route: `GET/POST /api/settings`


## v40 Portal Shell

This version adds a portal UI shell with a demo login screen, sidebar navigation and placeholder modules. It keeps the existing Cloudflare D1/R2 API from v39. The login screen is not production security; protect the app with Cloudflare Access or proper authentication before real data.
