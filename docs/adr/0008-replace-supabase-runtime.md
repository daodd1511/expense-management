# Replace the Supabase runtime with PostgreSQL and application-hosted authentication

The application will remove its Supabase runtime dependency and run plain PostgreSQL plus Better
Auth on the home server, with the Hono API as the only database caller. This accepts ownership of
database and identity operations to gain deployment control and vendor independence without
operating Supabase's PostgREST-centered self-hosted stack. Better Auth will use PostgreSQL-backed
server sessions delivered through secure `HttpOnly` cookies instead of browser-managed bearer
JWTs, allowing immediate session revocation while preserving public email/password registration
and sign-in; Google OAuth and password recovery are deferred from the migration, and after
validated cutover the application will remove its Supabase credentials and decommission the hosted
project.
