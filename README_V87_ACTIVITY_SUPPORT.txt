Barricora v87 - App Log + Support Access foundation

Run schema_v87_activity_support.sql in your existing Cloudflare D1 database before testing App Log / Support Access.

Added:
- Settings tile: App Log
- Settings tile: Support Access
- Activity log table for login/logout, user create/update, support access changes and blocked viewer writes
- Support access table for temporary Owner/Admin approval records

Note:
Support Access in v87 is the safe permission/logging foundation. It does not yet create a real Barricora global support account. That can be built next after company data separation.
