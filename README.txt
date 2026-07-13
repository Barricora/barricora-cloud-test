Barricora v80 Roles / View-only Access
- Adds Owner/Admin/Editor/Viewer role foundation.
- Adds Settings > Users / Roles management.
- Viewer is read-only in UI and backend API blocks non-GET requests for Viewer.
- No new SQL needed if v74 auth schema already exists.


V80 update:
- Added visible Log out button in the dashboard cloud panel next to Sync now.
- Sidebar/mobile logout remains available.
- No new SQL required.


Version v81 Login Refresh + Safer Logout Placement
- After login/register, the app performs a clean page refresh so roles/settings/user state load correctly when switching users.
- Removed the dashboard Log out button to avoid accidental clicks. Log out remains in the sidebar/mobile menu.
- No SQL changes required.
