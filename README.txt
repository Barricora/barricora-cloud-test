Barricora v64 PPE Worker Issue Flow
- PPE Issue now selects workers from the Workers database.
- Worker search added for issuing PPE.
- Multiple PPE items can be ticked and issued at once.
- PPE list is grouped by category in the issue flow.
- Stock is reduced per selected item and issue log remains.
- Return PPE button opens the issue log, where Delete / Return Stock returns stock.
- No new SQL needed.


v66 Workers + PPE Cloud Sync
- Adds D1 tables/API for workers, PPE stock and PPE issue log.
- Uses same D1 database, no second database.
- Run schema_v66_workers_ppe.sql after upload.
