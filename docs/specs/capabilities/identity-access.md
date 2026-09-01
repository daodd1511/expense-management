# Capability: Identity access

Applied: 2026-09-01 ← docs/specs/supabase-exit

## Requirement: Email and password access

Origin: delta ← docs/specs/supabase-exit

### Scenario: Visitor creates a User

**WHEN** a visitor submits a unique email and a valid password through public signup
**THEN** the app creates a User with a UUID, establishes a database-backed session, and grants
immediate access without requiring email verification

### Scenario: Existing User signs in

**WHEN** a User submits the correct email and password
**THEN** the app establishes a database-backed session and returns the User to the intended
protected route

### Scenario: User signs out

**WHEN** an authenticated User signs out
**THEN** the server revokes the session and the next protected request requires sign-in

### Scenario: Unsupported auth flow is requested

**WHEN** a visitor opens the authentication surface
**THEN** the app offers email/password signup and sign-in without Google OAuth or password
recovery controls

## Requirement: Private financial data access

Origin: delta ← docs/specs/supabase-exit

### Scenario: User accesses owned financial data

**WHEN** an authenticated User reads or changes financial data
**THEN** the API and database permit access only to rows owned by that User, except shared System
categories that every authenticated User may read

### Scenario: User attempts cross-User access

**WHEN** an authenticated User requests or submits an identifier owned by another User
**THEN** the operation reveals no private row and performs no mutation

### Scenario: Request has no valid session

**WHEN** a protected API request has no valid server session
**THEN** the API returns `401` without querying User-owned financial data

## Requirement: Persistent revocable session

Origin: delta ← docs/specs/supabase-exit

### Scenario: Active session continues

**WHEN** a User returns with a valid session inside its one-year sliding lifetime
**THEN** the app keeps the User signed in and refreshes the server-side expiry no more than once per
day

### Scenario: Session is revoked

**WHEN** the server revokes or expires a User's session
**THEN** the next request loses access even if the browser still holds the opaque session cookie
