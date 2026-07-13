Barricora v73 RAMS Register
- Adds RAMS register with PDF upload, revision/review tracking and cloud sync.
- Run schema_v73_rams.sql in your existing D1 database after upload.

Barricora v74 Real Login Auth
- Adds D1 users, companies and sessions.
- Adds working register/login/logout API.
- Protects data API routes with session middleware.
- Requires schema_v74_auth.sql in existing D1 database.


Barricora v75 Auth PBKDF2 Fix
- Cloudflare Web Crypto supports PBKDF2 iteration counts up to 100000.
- Reduced PBKDF2 iterations from 210000 to 100000 in auth routes.
- No new SQL needed if schema_v74_auth.sql was already run.
