# Multi-User Release Readiness — Plan

Produced via `/grill-with-docs`. This is a small friends-and-family readiness
check for an application that is already running in production.

## Goal

Allow two or three friends to sign up and use the existing deployment with
their own private financial data.

This is not Household sharing. Users do not share Accounts, Transactions,
Budgets, Subscriptions, or Categories.

## What Already Works

- Supabase Auth supports Google and email/password sign-in.
- The web app sends the signed-in User's JWT to the API.
- The API verifies the JWT, extracts the User ID, and applies that ID when
  reading and writing user-owned data.
- Existing repositories filter Accounts, Transactions, Budgets,
  Subscriptions, Favorites, and custom Categories by User ID.
- System Categories are intentionally visible to every User.
- Query-cache keys include the User ID.

The existing architecture is already designed for independent Users. It does
not need Household membership or a new ownership model for this release.

## Confirmed Problem

A new User has no Accounts. The Transaction form currently reads the first
Account without checking whether one exists, so opening Add Transaction can
fail for a newly registered User.

## Required Changes

1. Add a zero-Account first-use state with one primary action: **Create your
   first Account**.
2. Disable or redirect every Add Transaction entry point until an Account
   exists.
3. Make the Transaction form handle an empty Account list safely even if it is
   opened directly.
4. Keep new Users otherwise empty; do not create sample Accounts or
   Transactions. System Categories remain available.
5. Add focused regression tests for the zero-Account state and Transaction form.
6. Add focused API tests proving that one User cannot read, update, or delete a
   second User's data through the existing JWT/User-ID filtering.

## Production Check

Before giving the URL to friends, use two separate browser profiles:

1. Sign up as two different Users.
2. Create an Account and Transaction for each User.
3. Sign out and back in; confirm each User sees only their own data.
4. Confirm the existing owner's data remains visible and unchanged.
5. Confirm a brand-new User is guided to create an Account and cannot crash Add
   Transaction.

If these checks pass, the app is ready for the intended two-or-three-User use.

## Explicitly Out of Scope

- Household or shared-ledger features.
- Database-access architecture changes or a row-level-security redesign.
- Invitations, allowlists, admin dashboards, or user management.
- Backups, data export, Sentry, monitoring, or public-launch abuse controls.
- Seed/demo financial data.

## Terminology

- **User**: a person who signs up and has private financial data.
- **Account**: a place where money lives; never a login identity.
