# PostgreSQL RLS enforces user ownership

Financial tables will enforce ownership with PostgreSQL Row-Level Security using the
authenticated User UUID set locally within each request transaction. The application runtime
role cannot bypass these policies, while Better Auth uses a separate role and schema; this
accepts transaction plumbing to prevent a missing repository predicate from exposing another
User's financial data.
