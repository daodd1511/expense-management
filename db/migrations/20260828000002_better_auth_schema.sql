-- migrate:up

-- Better Auth's PostgreSQL schema, generated with `better-auth generate` against a
-- clean PostgreSQL 17 instance from the config in Phase 1 (email/password,
-- database-backed rate limiting, one-year sliding sessions with no cookie cache — the
-- confirmed decisions in docs/specs/supabase-exit/PLAN.md), then reviewed and edited:
--
--   * Every table is qualified into the `auth` schema. The runtime Better Auth pool
--     connects with `search_path=auth` (Better Auth's documented non-default-schema
--     pattern) so its own unqualified queries resolve here without further config.
--   * Every `id`/`userId` column is `uuid`, not Better Auth's default `text`. This
--     matches `advanced.database.generateId` returning `crypto.randomUUID()` for every
--     record, and lets `public.*` foreign keys reference `auth."user"(id)` natively
--     instead of comparing across incompatible types.
--
-- Never run `better-auth migrate` against this database: Dbmate is the only migration
-- runner, and this file is the sole source of truth for this schema.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth."user" (
    "id" uuid NOT NULL PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL,
    "image" text,
    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE auth."session" (
    "id" uuid NOT NULL PRIMARY KEY,
    "expiresAt" timestamptz NOT NULL,
    "token" text NOT NULL UNIQUE,
    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL REFERENCES auth."user"("id") ON DELETE CASCADE
);

CREATE TABLE auth."account" (
    "id" uuid NOT NULL PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL REFERENCES auth."user"("id") ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamptz,
    "refreshTokenExpiresAt" timestamptz,
    "scope" text,
    "password" text,
    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamptz NOT NULL
);

CREATE TABLE auth."verification" (
    "id" uuid NOT NULL PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" timestamptz NOT NULL,
    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE auth."rateLimit" (
    "id" uuid NOT NULL PRIMARY KEY,
    "key" text NOT NULL UNIQUE,
    "count" integer NOT NULL,
    "lastRequest" bigint NOT NULL
);

CREATE INDEX "session_userId_idx" ON auth."session" ("userId");
CREATE INDEX "account_userId_idx" ON auth."account" ("userId");
CREATE INDEX "verification_identifier_idx" ON auth."verification" ("identifier");

-- migrate:down

DROP TABLE IF EXISTS auth."rateLimit";
DROP TABLE IF EXISTS auth."verification";
DROP TABLE IF EXISTS auth."account";
DROP TABLE IF EXISTS auth."session";
DROP TABLE IF EXISTS auth."user";
DROP SCHEMA IF EXISTS auth;
