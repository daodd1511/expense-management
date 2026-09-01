-- migrate:up

-- Access boundary for the two runtime roles (ADR-0010). `wallet_migrator` owns every
-- object created so far and is therefore exempt from RLS by default; `wallet_app` and
-- `wallet_auth` hold only the grants below and can never bypass a policy.

CREATE SCHEMA IF NOT EXISTS wallet;

-- Reads the transaction-local authenticated User UUID set by `withAppTransaction` via
-- `set_config('wallet.user_id', <uuid>, true)` (the `true` "is_local" flag is what
-- keeps this scoped to one transaction on a pooled connection, never a whole session).
-- Returns NULL when the setting is absent or empty, which makes every policy below
-- deny access rather than compare against a real owner; a malformed (non-UUID) value
-- raises instead of silently matching nothing, which fails the request closed the same
-- way. Either path leaves no row visible without a validly-set identity.
CREATE FUNCTION wallet.current_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT nullif(current_setting('wallet.user_id', true), '')::uuid
$$;

GRANT USAGE ON SCHEMA wallet TO wallet_app;
GRANT EXECUTE ON FUNCTION wallet.current_user_id() TO wallet_app;

GRANT USAGE ON SCHEMA public TO wallet_app;
GRANT USAGE ON SCHEMA auth TO wallet_auth;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.accounts, public.budgets, public.categories, public.category_translations,
    public.category_favorites, public.loan_people, public.loans, public.loan_events,
    public.subscriptions, public.transactions
    TO wallet_app;

GRANT EXECUTE ON FUNCTION
    public.reorder_accounts(uuid, uuid[]),
    public.create_transfer_with_fee(uuid, bigint, uuid, uuid, text, text, date, time, text, bigint),
    public.log_subscription(uuid, uuid, text, numeric, uuid, uuid, text, text, date, date),
    public.create_opening_loan(uuid, uuid, text, text, bigint, date, date, date, text),
    public.create_disbursed_loan(uuid, uuid, text, text, bigint, uuid, date, date, text),
    public.create_loan_repayment(uuid, uuid, bigint, uuid, date),
    public.update_loan_repayment(uuid, uuid, bigint, uuid, date),
    public.update_loan_disbursement(uuid, uuid, bigint, uuid, date),
    public.close_loan(uuid, uuid, text, date)
    TO wallet_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    auth."user", auth."session", auth."account", auth."verification", auth."rateLimit"
    TO wallet_auth;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Plain owner-only tables: every row belongs to exactly one User, never shared.

CREATE POLICY "owner only" ON public.accounts
    USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "owner only" ON public.budgets
    USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "owner only" ON public.loan_people
    USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "owner only" ON public.loans
    USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "owner only" ON public.loan_events
    USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "owner only" ON public.subscriptions
    USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "owner only" ON public.transactions
    USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());

-- `category_favorites` owns its rows by `user_id`, not `owner_id`, but the rule is the
-- same: a User only ever sees or touches their own favorites.

CREATE POLICY "owner only" ON public.category_favorites
    USING (user_id = wallet.current_user_id()) WITH CHECK (user_id = wallet.current_user_id());

-- `categories` splits by command: every authenticated User may read a shared System
-- category (`owner_id IS NULL`) alongside their own, but `owner_id IS NULL` never
-- satisfies the write-side predicates below, so no runtime request can create, edit,
-- or delete a System category — only `wallet_migrator`, which owns the table and is
-- exempt from RLS, can seed or change them.

CREATE POLICY "read own or system" ON public.categories
    FOR SELECT USING (owner_id = wallet.current_user_id() OR owner_id IS NULL);
CREATE POLICY "create own only" ON public.categories
    FOR INSERT WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "update own only" ON public.categories
    FOR UPDATE USING (owner_id = wallet.current_user_id()) WITH CHECK (owner_id = wallet.current_user_id());
CREATE POLICY "delete own only" ON public.categories
    FOR DELETE USING (owner_id = wallet.current_user_id());

-- `category_translations` has no owner column at all: every row today belongs to a
-- System category (see the seed migration), so every authenticated User may read it
-- and none may write it through the application role.

CREATE POLICY "read all" ON public.category_translations FOR SELECT USING (true);

-- migrate:down

DROP POLICY IF EXISTS "read all" ON public.category_translations;
DROP POLICY IF EXISTS "delete own only" ON public.categories;
DROP POLICY IF EXISTS "update own only" ON public.categories;
DROP POLICY IF EXISTS "create own only" ON public.categories;
DROP POLICY IF EXISTS "read own or system" ON public.categories;
DROP POLICY IF EXISTS "owner only" ON public.category_favorites;
DROP POLICY IF EXISTS "owner only" ON public.transactions;
DROP POLICY IF EXISTS "owner only" ON public.subscriptions;
DROP POLICY IF EXISTS "owner only" ON public.loan_events;
DROP POLICY IF EXISTS "owner only" ON public.loans;
DROP POLICY IF EXISTS "owner only" ON public.loan_people;
DROP POLICY IF EXISTS "owner only" ON public.budgets;
DROP POLICY IF EXISTS "owner only" ON public.accounts;

ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_people DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_translations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON auth."user", auth."session", auth."account", auth."verification", auth."rateLimit" FROM wallet_auth;

REVOKE ALL ON FUNCTION
    public.reorder_accounts(uuid, uuid[]),
    public.create_transfer_with_fee(uuid, bigint, uuid, uuid, text, text, date, time, text, bigint),
    public.log_subscription(uuid, uuid, text, numeric, uuid, uuid, text, text, date, date),
    public.create_opening_loan(uuid, uuid, text, text, bigint, date, date, date, text),
    public.create_disbursed_loan(uuid, uuid, text, text, bigint, uuid, date, date, text),
    public.create_loan_repayment(uuid, uuid, bigint, uuid, date),
    public.update_loan_repayment(uuid, uuid, bigint, uuid, date),
    public.update_loan_disbursement(uuid, uuid, bigint, uuid, date),
    public.close_loan(uuid, uuid, text, date)
    FROM wallet_app;

REVOKE ALL ON
    public.accounts, public.budgets, public.categories, public.category_translations,
    public.category_favorites, public.loan_people, public.loans, public.loan_events,
    public.subscriptions, public.transactions
    FROM wallet_app;

REVOKE USAGE ON SCHEMA auth FROM wallet_auth;
REVOKE USAGE ON SCHEMA public FROM wallet_app;
REVOKE USAGE ON SCHEMA wallet FROM wallet_app;

DROP FUNCTION IF EXISTS wallet.current_user_id();
DROP SCHEMA IF EXISTS wallet;
