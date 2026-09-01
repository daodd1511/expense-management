# Use Kysely for the application data layer

Application repositories will access PostgreSQL through `pg` and Kysely while raw SQL migrations
remain the schema authority and Dbmate tracks and applies them. This preserves the database-first
design and strict result typing without introducing an ORM schema that can drift from the
PostgreSQL functions and constraints.
