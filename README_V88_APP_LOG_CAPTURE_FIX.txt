Barricora v88 - App Log Capture Fix

Fixes App Log not showing normal app activity.

Changes:
- Added App Log capture for successful/failed app write requests.
- PPE, Workers, RAMS, Audits, Findings, Daily, Toolbox and Settings changes now create App Log entries.
- Fixed missing App Log helper in Users/Roles API.
- Updated App Log labels and empty state.

SQL:
- No new SQL needed if schema_v87_activity_support.sql was already run.
- If App Log table was never created, run schema_v87_activity_support.sql.
