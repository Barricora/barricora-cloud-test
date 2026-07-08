Barricora v67 PPE Return Flow

Built from v66 Workers + PPE Cloud Sync.

Changes:
- PPE Issue Log now has a red trash icon in the top-right of each issue card.
- Trash/delete removes the issue record only and does not return stock.
- Return PPE button now opens a dedicated return workflow.
- Return workflow lists workers who currently have PPE issued.
- Search/filter workers in Return PPE.
- Select worker, tick returned PPE items, then click Return PPE.
- Returned PPE is removed from the issue log and added back into stock.
- Workers/PPE still sync to the same D1 database through /api/workers and /api/ppe.

No new SQL required if v66 schema was already run.
