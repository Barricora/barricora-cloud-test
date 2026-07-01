Barricora Wizard Audit v40 Portal Shell

Built from v39 App Settings.
- Adds login screen mock/demo.
- Adds safety portal layout with left sidebar menu and mobile menu.
- Adds Dashboard, Audits, Daily Checklists, Toolbox Talks, RAMS, Actions, Findings, PPE and Settings sections.
- Current audit workflow is kept under Audits.
- Placeholder module pages prepared for next builds.
- Keeps D1/R2 cloud functions from v39.

Important: the login screen is a UI/demo layer only. Use Cloudflare Access or proper authentication before real client data.


Barricora v41 Findings Module
- Adds real Findings module with multiple photo upload.
- Findings can create linked actions.
- Linked finding actions appear in main Action / Issue List.
- Closing a linked action also closes the finding, while keeping it in history.
- Adds Cloudflare API route /api/findings and D1 table findings.
- Run schema_v41_findings.sql in D1 after deployment.
