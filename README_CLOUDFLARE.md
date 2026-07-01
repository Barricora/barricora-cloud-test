Barricora v51 MEWP Spotter Question

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


## v41 Findings setup

After uploading v41 to GitHub and redeploying Cloudflare Pages, run this new SQL file in your D1 database console:

```sql
-- use file: schema_v41_findings.sql
```

This creates the `findings` table. Existing audit/settings tables do not need to be changed.

New API routes:

- `GET /api/findings`
- `POST /api/findings`
- `DELETE /api/findings/:id`

Finding photos and close-out photos are stored in the existing R2 binding `AUDIT_PHOTOS`.


## v42 note
No new D1 schema is required if `schema_v41_findings.sql` was already run. Deploy through GitHub as before.


## v43 Action Update Flow
No new SQL is required. Upload to GitHub and let Cloudflare Pages redeploy. The action list now uses an Update screen where actions can be marked Open/In Progress or closed out with evidence.


## v44 Daily Checklists

v44 adds the Daily Checklists module and a new API route:

```text
/api/daily
```

Before using daily checklists in cloud mode, run this SQL file in your D1 database:

```text
schema_v44_daily_checklists.sql
```

Then test:

```text
https://your-pages-url.pages.dev/api/daily
```

Expected first result:

```json
{"ok":true,"daily":[]}
```

Daily checklist photos and close-out photos are stored in the same R2 bucket using the `AUDIT_PHOTOS` binding.


## v45 Action Status Colours
- No new D1 schema required if v44 schema has already been run.
- Upload to GitHub and let Cloudflare Pages redeploy.
- Actions page opens the Open filter by default.
- Action cards are colour-coded by status.


## v46 Full Action Tile Colours

This version only changes action list styling so the whole action tile/card uses the status colour. No new D1 SQL is required.


## v50
- Rebuilt from stable v46.
- Adds focused daily checklist tiles safely.
- Visible v50 badge added to dashboard to confirm deployment/cache.
