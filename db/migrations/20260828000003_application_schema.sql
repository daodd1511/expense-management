-- migrate:up

-- Application schema baseline, reviewed from a schema-only export of the live Supabase
-- `public` schema (`db_cluster-20-08-2026@08-12-06.backup`, cluster dump; the export
-- itself is never committed). Preserves every application table, constraint, index,
-- trigger, and the nine atomic PostgreSQL functions the API depends on.
--
-- Deliberate departures from the live source, called out for review:
--   * Supabase-specific owners, GRANTs, `extensions`-schema references, PostgREST
--     exposure, and RLS policies bound to `auth.uid()` are dropped; RLS is redefined in
--     the next migration against `wallet.current_user_id()`.
--   * `budgets_owner_id_category_id_key` is not carried forward: it duplicated
--     `budgets_owner_category_unique` (both `UNIQUE (owner_id, category_id)`) with no
--     behavioral difference, so only one survives.
--   * Every function gets an explicit `SET search_path = public, pg_temp`. The source
--     relied on the caller's search_path; pinning it is a standard hardening step for
--     the new multi-role/RLS boundary (ADR-0010) and does not change any function's
--     business behavior.
--   * `gen_random_uuid()` needs no extension on PostgreSQL 17 (built into core since 13),
--     so the `pgcrypto`/`uuid-ossp` extensions from the source are not recreated.
--
-- Not a departure, called out because it looks like one: the owner/user FK `ON DELETE`
-- behavior below is asymmetric on purpose, exactly matching the source — `accounts`,
-- `categories`, `budgets`, `subscriptions`, and `transactions` cascade; `category_favorites`,
-- `loan_people`, `loans`, and `loan_events` do not (default `RESTRICT`). Verified against
-- the reviewed dump's FK section, not introduced by this port.
--
-- Every owner/user identity column below references `auth."user"(id)`, the Better Auth
-- table created by the previous migration.

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    opening_balance bigint DEFAULT 0 NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_order integer NOT NULL,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT accounts_display_order_nonnegative CHECK (display_order >= 0),
    CONSTRAINT accounts_kind_check CHECK (kind = ANY (ARRAY['cash', 'bank', 'card', 'ewallet']::text[])),
    CONSTRAINT accounts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id) ON DELETE CASCADE
);

CREATE INDEX accounts_owner_active_display_order_idx
    ON public.accounts USING btree (owner_id, archived, display_order, created_at, id);

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    name text NOT NULL,
    icon text NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    parent_id uuid,
    is_hidden boolean DEFAULT false NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_type_check CHECK (type = ANY (ARRAY['expense', 'income']::text[])),
    CONSTRAINT categories_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id) ON DELETE CASCADE,
    CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);

CREATE TABLE public.category_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    locale text NOT NULL,
    name text NOT NULL,
    CONSTRAINT category_translations_pkey PRIMARY KEY (id),
    CONSTRAINT category_translations_locale_check CHECK (locale = ANY (ARRAY['vi', 'en']::text[])),
    CONSTRAINT category_translations_category_id_locale_key UNIQUE (category_id, locale),
    CONSTRAINT category_translations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

CREATE TABLE public.category_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT category_favorites_pkey PRIMARY KEY (id),
    CONSTRAINT category_favorites_user_id_category_id_key UNIQUE (user_id, category_id),
    CONSTRAINT category_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth."user"(id),
    CONSTRAINT category_favorites_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    category_id uuid NOT NULL,
    amount bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scope text DEFAULT 'self' NOT NULL,
    CONSTRAINT budgets_pkey PRIMARY KEY (id),
    CONSTRAINT budgets_scope_check CHECK (scope = ANY (ARRAY['self', 'tree']::text[])),
    CONSTRAINT budgets_owner_category_unique UNIQUE (owner_id, category_id),
    CONSTRAINT budgets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id) ON DELETE CASCADE,
    CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

CREATE TABLE public.loan_people (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loan_people_pkey PRIMARY KEY (id),
    CONSTRAINT loan_people_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id)
);

CREATE INDEX loan_people_owner_id_idx ON public.loan_people USING btree (owner_id);

CREATE TABLE public.loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    person_id uuid NOT NULL,
    direction text NOT NULL,
    description text,
    note text,
    due_date date,
    original_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loans_pkey PRIMARY KEY (id),
    CONSTRAINT loans_direction_check CHECK (direction = ANY (ARRAY['lending', 'borrowing']::text[])),
    CONSTRAINT loans_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id),
    CONSTRAINT loans_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.loan_people(id)
);

CREATE INDEX loans_owner_person_idx ON public.loans USING btree (owner_id, person_id);
CREATE INDEX loans_owner_due_date_idx ON public.loans USING btree (owner_id, due_date) WHERE (due_date IS NOT NULL);

CREATE TABLE public.loan_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    loan_id uuid NOT NULL,
    kind text NOT NULL,
    amount bigint NOT NULL,
    event_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loan_events_pkey PRIMARY KEY (id),
    CONSTRAINT loan_events_amount_check CHECK (amount > 0),
    CONSTRAINT loan_events_kind_check
        CHECK (kind = ANY (ARRAY['disbursement', 'opening', 'repayment', 'write_off', 'forgiveness']::text[])),
    CONSTRAINT loan_events_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id),
    CONSTRAINT loan_events_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE
);

CREATE INDEX loan_events_owner_loan_idx ON public.loan_events USING btree (owner_id, loan_id);
CREATE UNIQUE INDEX loan_events_one_origin_idx
    ON public.loan_events USING btree (loan_id) WHERE (kind = ANY (ARRAY['disbursement', 'opening']::text[]));
CREATE UNIQUE INDEX loan_events_one_closing_idx
    ON public.loan_events USING btree (loan_id) WHERE (kind = ANY (ARRAY['write_off', 'forgiveness']::text[]));

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    amount bigint NOT NULL,
    type text NOT NULL,
    category_id uuid,
    account_id uuid NOT NULL,
    cadence text NOT NULL,
    day_of_month integer NOT NULL,
    month_of_year integer NOT NULL,
    next_due_date date NOT NULL,
    note text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_cadence_check CHECK (cadence = ANY (ARRAY['monthly', 'yearly']::text[])),
    CONSTRAINT subscriptions_day_of_month_check CHECK (day_of_month >= 1 AND day_of_month <= 28),
    CONSTRAINT subscriptions_month_of_year_check CHECK (month_of_year >= 1 AND month_of_year <= 12),
    CONSTRAINT subscriptions_type_check CHECK (type = ANY (ARRAY['expense', 'income']::text[])),
    CONSTRAINT subscriptions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id) ON DELETE CASCADE,
    CONSTRAINT subscriptions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
    CONSTRAINT subscriptions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE
);

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    type text NOT NULL,
    amount bigint NOT NULL,
    category_id uuid,
    account_id uuid NOT NULL,
    to_account_id uuid,
    merchant text DEFAULT '' NOT NULL,
    note text,
    tx_date date NOT NULL,
    receipt_url text,
    subscription_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tx_time time without time zone,
    linked_transfer_id uuid,
    cash_flow_direction text,
    loan_event_id uuid,
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_type_check CHECK (type = ANY (ARRAY['expense', 'income', 'transfer', 'loan']::text[])),
    CONSTRAINT transactions_cash_flow_direction_check
        CHECK (cash_flow_direction = ANY (ARRAY['inflow', 'outflow']::text[])),
    CONSTRAINT transactions_loan_fields_check CHECK (
        (type = 'loan' AND cash_flow_direction IS NOT NULL AND loan_event_id IS NOT NULL
            AND category_id IS NULL AND to_account_id IS NULL)
        OR (type <> 'loan' AND cash_flow_direction IS NULL AND loan_event_id IS NULL)
    ),
    CONSTRAINT transactions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth."user"(id) ON DELETE CASCADE,
    CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
    CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
    CONSTRAINT transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    CONSTRAINT transactions_linked_transfer_id_fkey FOREIGN KEY (linked_transfer_id) REFERENCES public.transactions(id) ON DELETE CASCADE,
    CONSTRAINT transactions_loan_event_id_fkey FOREIGN KEY (loan_event_id) REFERENCES public.loan_events(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX transactions_loan_event_id_key
    ON public.transactions USING btree (loan_event_id) WHERE (loan_event_id IS NOT NULL);

-- Triggers

CREATE FUNCTION public.set_account_display_order() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
begin
  if new.display_order is null then
    perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

    select coalesce(max(display_order) + 1, 0)
    into new.display_order
    from accounts
    where owner_id = new.owner_id
      and archived = false;
  end if;

  return new;
end;
$$;

CREATE TRIGGER accounts_set_display_order
    BEFORE INSERT ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.set_account_display_order();

CREATE FUNCTION public.categories_validate_hierarchy() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  parent_type text;
  parent_parent_id uuid;
  own_child_count int;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'category % cannot be its own parent', new.id;
  end if;

  select type, parent_id into parent_type, parent_parent_id
  from categories
  where id = new.parent_id;

  if parent_type is null then
    raise exception 'parent category % does not exist', new.parent_id;
  end if;

  if parent_parent_id is not null then
    raise exception 'parent_id target % is itself a child; nesting is capped at 2 levels', new.parent_id;
  end if;

  if parent_type <> new.type then
    raise exception 'category type % does not match parent type %', new.type, parent_type;
  end if;

  select count(*) into own_child_count
  from categories
  where parent_id = new.id;

  if own_child_count > 0 then
    raise exception 'category % has children and cannot itself receive a parent_id', new.id;
  end if;

  return new;
end;
$$;

CREATE TRIGGER categories_validate_hierarchy_trigger
    BEFORE INSERT OR UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.categories_validate_hierarchy();

-- Atomic financial functions (all nine ported verbatim; behavior unchanged)

CREATE FUNCTION public.reorder_accounts(p_owner_id uuid, p_account_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_active_count integer;
  v_distinct_count integer;
  v_owned_count integer;
begin
  if p_account_ids is null or array_position(p_account_ids, null) is not null then
    raise exception 'Account order must contain non-null IDs' using errcode = '22023';
  end if;

  perform 1
  from accounts
  where owner_id = p_owner_id
    and archived = false
  for update;

  select count(*)
  into v_active_count
  from accounts
  where owner_id = p_owner_id
    and archived = false;

  select count(distinct account_id)
  into v_distinct_count
  from unnest(p_account_ids) as requested(account_id);

  select count(*)
  into v_owned_count
  from accounts
  where owner_id = p_owner_id
    and archived = false
    and id = any(p_account_ids);

  if cardinality(p_account_ids) <> v_active_count
    or v_distinct_count <> v_active_count
    or v_owned_count <> v_active_count then
    raise exception 'Account order must contain every active Account exactly once'
      using errcode = '22023';
  end if;

  update accounts as account
  set display_order = requested.ordinality - 1
  from unnest(p_account_ids) with ordinality as requested(id, ordinality)
  where account.id = requested.id
    and account.owner_id = p_owner_id
    and account.archived = false;
end;
$$;

CREATE FUNCTION public.create_transfer_with_fee(
    p_owner_id uuid, p_amount bigint, p_account_id uuid, p_to_account_id uuid, p_merchant text,
    p_note text, p_tx_date date, p_tx_time time without time zone, p_receipt_url text, p_fee bigint
) RETURNS SETOF public.transactions
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_transfer transactions%rowtype;
  v_category_id uuid;
begin
  select id into v_category_id from categories
  where owner_id is null and name = 'Transfer Fee' and type = 'expense';
  if v_category_id is null then raise exception 'Transfer Fee category not found'; end if;

  insert into transactions (owner_id, type, amount, category_id, account_id, to_account_id, merchant, note, tx_date, tx_time, receipt_url)
  values (p_owner_id, 'transfer', p_amount, null, p_account_id, p_to_account_id, p_merchant, p_note, p_tx_date, p_tx_time, p_receipt_url)
  returning * into v_transfer;

  insert into transactions (owner_id, type, amount, category_id, account_id, to_account_id, merchant, note, tx_date, tx_time, receipt_url, linked_transfer_id)
  values (p_owner_id, 'expense', p_fee, v_category_id, p_account_id, null, 'Transfer Fee', null, p_tx_date, p_tx_time, null, v_transfer.id);

  return next v_transfer;
end;
$$;

CREATE FUNCTION public.log_subscription(
    p_owner_id uuid, p_subscription_id uuid, p_type text, p_amount numeric, p_category_id uuid,
    p_account_id uuid, p_merchant text, p_note text, p_tx_date date, p_next_due_date date
) RETURNS TABLE(
    tx_id uuid, tx_owner_id uuid, tx_type text, tx_amount bigint, tx_category_id uuid, tx_account_id uuid,
    tx_to_account_id uuid, tx_merchant text, tx_note text, tx_tx_date date, tx_receipt_url text,
    tx_subscription_id uuid, tx_created_at timestamp with time zone, sub_id uuid, sub_owner_id uuid,
    sub_name text, sub_amount bigint, sub_type text, sub_category_id uuid, sub_account_id uuid,
    sub_cadence text, sub_day_of_month integer, sub_month_of_year integer, sub_next_due_date date,
    sub_note text, sub_active boolean, sub_created_at timestamp with time zone
)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_tx transactions%rowtype;
  v_sub subscriptions%rowtype;
begin
  select * into v_sub
  from subscriptions
  where id = p_subscription_id and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  insert into transactions (
    owner_id, type, amount, category_id, account_id, to_account_id,
    merchant, note, tx_date, receipt_url, subscription_id
  ) values (
    p_owner_id, p_type, p_amount, p_category_id, p_account_id, null,
    p_merchant, p_note, p_tx_date, null, p_subscription_id
  )
  returning * into v_tx;

  update subscriptions
  set next_due_date = p_next_due_date
  where id = p_subscription_id and owner_id = p_owner_id
  returning * into v_sub;

  return query select
    v_tx.id, v_tx.owner_id, v_tx.type, v_tx.amount, v_tx.category_id, v_tx.account_id,
    v_tx.to_account_id, v_tx.merchant, v_tx.note, v_tx.tx_date, v_tx.receipt_url,
    v_tx.subscription_id, v_tx.created_at,
    v_sub.id, v_sub.owner_id, v_sub.name, v_sub.amount, v_sub.type, v_sub.category_id,
    v_sub.account_id, v_sub.cadence, v_sub.day_of_month, v_sub.month_of_year,
    v_sub.next_due_date, v_sub.note, v_sub.active, v_sub.created_at;
end;
$$;

CREATE FUNCTION public.create_opening_loan(
    p_owner_id uuid, p_person_id uuid, p_direction text, p_description text, p_amount bigint,
    p_balance_as_of date, p_original_date date, p_due_date date, p_note text
) RETURNS TABLE(
    loan_id uuid, loan_owner_id uuid, loan_person_id uuid, loan_direction text, loan_description text,
    loan_note text, loan_due_date date, loan_original_date date, loan_created_at timestamp with time zone,
    event_id uuid, event_owner_id uuid, event_loan_id uuid, event_kind text, event_amount bigint,
    event_event_date date, event_created_at timestamp with time zone
)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_loan loans%rowtype;
  v_event loan_events%rowtype;
begin
  if p_direction not in ('lending', 'borrowing') then
    raise exception 'Invalid loan direction' using errcode = '22023';
  end if;

  if not exists (select 1 from loan_people where id = p_person_id and owner_id = p_owner_id) then
    raise exception 'Person not found' using errcode = 'P0002';
  end if;

  insert into loans (owner_id, person_id, direction, description, due_date, original_date, note)
  values (p_owner_id, p_person_id, p_direction, p_description, p_due_date, p_original_date, p_note)
  returning * into v_loan;

  insert into loan_events (owner_id, loan_id, kind, amount, event_date)
  values (p_owner_id, v_loan.id, 'opening', p_amount, p_balance_as_of)
  returning * into v_event;

  return query select
    v_loan.id, v_loan.owner_id, v_loan.person_id, v_loan.direction, v_loan.description,
    v_loan.note, v_loan.due_date, v_loan.original_date, v_loan.created_at,
    v_event.id, v_event.owner_id, v_event.loan_id, v_event.kind, v_event.amount,
    v_event.event_date, v_event.created_at;
end;
$$;

CREATE FUNCTION public.create_disbursed_loan(
    p_owner_id uuid, p_person_id uuid, p_direction text, p_description text, p_amount bigint,
    p_account_id uuid, p_event_date date, p_due_date date, p_note text
) RETURNS TABLE(
    loan_id uuid, loan_owner_id uuid, loan_person_id uuid, loan_direction text, loan_description text,
    loan_note text, loan_due_date date, loan_original_date date, loan_created_at timestamp with time zone,
    event_id uuid, event_owner_id uuid, event_loan_id uuid, event_kind text, event_amount bigint,
    event_event_date date, event_created_at timestamp with time zone, tx_id uuid, tx_owner_id uuid,
    tx_type text, tx_amount bigint, tx_account_id uuid, tx_cash_flow_direction text, tx_loan_event_id uuid,
    tx_merchant text, tx_tx_date date, tx_created_at timestamp with time zone
)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_loan loans%rowtype;
  v_event loan_events%rowtype;
  v_tx transactions%rowtype;
  v_cash_flow_direction text;
  v_merchant text;
begin
  if p_direction not in ('lending', 'borrowing') then
    raise exception 'Invalid loan direction' using errcode = '22023';
  end if;

  if not exists (select 1 from loan_people where id = p_person_id and owner_id = p_owner_id) then
    raise exception 'Person not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from accounts where id = p_account_id and owner_id = p_owner_id) then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  v_cash_flow_direction := case when p_direction = 'lending' then 'outflow' else 'inflow' end;
  v_merchant := case when p_direction = 'lending' then 'Lent' else 'Borrowed' end;

  insert into loans (owner_id, person_id, direction, description, due_date, note)
  values (p_owner_id, p_person_id, p_direction, p_description, p_due_date, p_note)
  returning * into v_loan;

  insert into loan_events (owner_id, loan_id, kind, amount, event_date)
  values (p_owner_id, v_loan.id, 'disbursement', p_amount, p_event_date)
  returning * into v_event;

  insert into transactions (
    owner_id, type, amount, category_id, account_id, to_account_id,
    merchant, tx_date, cash_flow_direction, loan_event_id
  ) values (
    p_owner_id, 'loan', p_amount, null, p_account_id, null,
    v_merchant, p_event_date, v_cash_flow_direction, v_event.id
  )
  returning * into v_tx;

  return query select
    v_loan.id, v_loan.owner_id, v_loan.person_id, v_loan.direction, v_loan.description,
    v_loan.note, v_loan.due_date, v_loan.original_date, v_loan.created_at,
    v_event.id, v_event.owner_id, v_event.loan_id, v_event.kind, v_event.amount,
    v_event.event_date, v_event.created_at,
    v_tx.id, v_tx.owner_id, v_tx.type, v_tx.amount, v_tx.account_id,
    v_tx.cash_flow_direction, v_tx.loan_event_id, v_tx.merchant, v_tx.tx_date, v_tx.created_at;
end;
$$;

CREATE FUNCTION public.create_loan_repayment(
    p_owner_id uuid, p_loan_id uuid, p_amount bigint, p_account_id uuid, p_event_date date
) RETURNS TABLE(
    event_id uuid, event_owner_id uuid, event_loan_id uuid, event_kind text, event_amount bigint,
    event_event_date date, event_created_at timestamp with time zone, tx_id uuid, tx_owner_id uuid,
    tx_type text, tx_amount bigint, tx_account_id uuid, tx_cash_flow_direction text, tx_loan_event_id uuid,
    tx_merchant text, tx_tx_date date, tx_created_at timestamp with time zone
)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_loan loans%rowtype;
  v_origin_amount bigint;
  v_repaid bigint;
  v_outstanding bigint;
  v_event loan_events%rowtype;
  v_tx transactions%rowtype;
  v_cash_flow_direction text;
  v_merchant text;
begin
  select * into v_loan from loans where id = p_loan_id and owner_id = p_owner_id for update;
  if not found then
    raise exception 'Loan not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from loan_events
    where loan_id = p_loan_id and kind in ('write_off', 'forgiveness')
  ) then
    raise exception 'Loan is closed' using errcode = '22023';
  end if;

  if not exists (select 1 from accounts where id = p_account_id and owner_id = p_owner_id) then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  -- The loans row lock above already serializes concurrent mutations on this loan,
  -- so these aggregate reads don't need their own row lock (and FOR UPDATE can't be
  -- combined with an aggregate function in the same SELECT).
  select amount into v_origin_amount from loan_events
  where loan_id = p_loan_id and kind in ('disbursement', 'opening');

  select coalesce(sum(amount), 0) into v_repaid from loan_events
  where loan_id = p_loan_id and kind = 'repayment';

  v_outstanding := v_origin_amount - v_repaid;

  if p_amount <= 0 or p_amount > v_outstanding then
    raise exception 'Repayment amount must be positive and not exceed the outstanding balance'
      using errcode = '22023';
  end if;

  v_cash_flow_direction := case when v_loan.direction = 'lending' then 'inflow' else 'outflow' end;
  v_merchant := case when v_loan.direction = 'lending' then 'Repayment received' else 'Repayment paid' end;

  insert into loan_events (owner_id, loan_id, kind, amount, event_date)
  values (p_owner_id, p_loan_id, 'repayment', p_amount, p_event_date)
  returning * into v_event;

  insert into transactions (
    owner_id, type, amount, category_id, account_id, to_account_id,
    merchant, tx_date, cash_flow_direction, loan_event_id
  ) values (
    p_owner_id, 'loan', p_amount, null, p_account_id, null,
    v_merchant, p_event_date, v_cash_flow_direction, v_event.id
  )
  returning * into v_tx;

  return query select
    v_event.id, v_event.owner_id, v_event.loan_id, v_event.kind, v_event.amount,
    v_event.event_date, v_event.created_at,
    v_tx.id, v_tx.owner_id, v_tx.type, v_tx.amount, v_tx.account_id,
    v_tx.cash_flow_direction, v_tx.loan_event_id, v_tx.merchant, v_tx.tx_date, v_tx.created_at;
end;
$$;

CREATE FUNCTION public.update_loan_repayment(
    p_owner_id uuid, p_event_id uuid, p_amount bigint, p_account_id uuid, p_event_date date
) RETURNS TABLE(
    event_id uuid, event_owner_id uuid, event_loan_id uuid, event_kind text, event_amount bigint,
    event_event_date date, event_created_at timestamp with time zone, tx_id uuid, tx_owner_id uuid,
    tx_type text, tx_amount bigint, tx_account_id uuid, tx_cash_flow_direction text, tx_loan_event_id uuid,
    tx_merchant text, tx_tx_date date, tx_created_at timestamp with time zone
)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_event loan_events%rowtype;
  v_loan loans%rowtype;
  v_origin_amount bigint;
  v_other_repaid bigint;
  v_outstanding bigint;
  v_tx transactions%rowtype;
begin
  select * into v_event from loan_events
  where id = p_event_id and owner_id = p_owner_id and kind = 'repayment'
  for update;
  if not found then
    raise exception 'Repayment not found' using errcode = 'P0002';
  end if;

  select * into v_loan from loans where id = v_event.loan_id and owner_id = p_owner_id for update;

  if not exists (select 1 from accounts where id = p_account_id and owner_id = p_owner_id) then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  select amount into v_origin_amount from loan_events
  where loan_id = v_loan.id and kind in ('disbursement', 'opening');

  select coalesce(sum(amount), 0) into v_other_repaid from loan_events
  where loan_id = v_loan.id and kind = 'repayment' and id <> p_event_id;

  v_outstanding := v_origin_amount - v_other_repaid;

  if p_amount <= 0 or p_amount > v_outstanding then
    raise exception 'Repayment amount must be positive and not exceed the outstanding balance'
      using errcode = '22023';
  end if;

  update loan_events set amount = p_amount, event_date = p_event_date
  where id = p_event_id
  returning * into v_event;

  update transactions
  set amount = p_amount, account_id = p_account_id, tx_date = p_event_date
  where loan_event_id = p_event_id
  returning * into v_tx;

  return query select
    v_event.id, v_event.owner_id, v_event.loan_id, v_event.kind, v_event.amount,
    v_event.event_date, v_event.created_at,
    v_tx.id, v_tx.owner_id, v_tx.type, v_tx.amount, v_tx.account_id,
    v_tx.cash_flow_direction, v_tx.loan_event_id, v_tx.merchant, v_tx.tx_date, v_tx.created_at;
end;
$$;

CREATE FUNCTION public.update_loan_disbursement(
    p_owner_id uuid, p_loan_id uuid, p_amount bigint, p_account_id uuid, p_event_date date
) RETURNS TABLE(
    event_id uuid, event_owner_id uuid, event_loan_id uuid, event_kind text, event_amount bigint,
    event_event_date date, event_created_at timestamp with time zone, tx_id uuid, tx_owner_id uuid,
    tx_type text, tx_amount bigint, tx_account_id uuid, tx_cash_flow_direction text, tx_loan_event_id uuid,
    tx_merchant text, tx_tx_date date, tx_created_at timestamp with time zone
)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_event loan_events%rowtype;
  v_repaid bigint;
  v_tx transactions%rowtype;
begin
  select * into v_event from loan_events
  where loan_id = p_loan_id and owner_id = p_owner_id and kind = 'disbursement'
  for update;
  if not found then
    raise exception 'Disbursement not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from accounts where id = p_account_id and owner_id = p_owner_id) then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0) into v_repaid from loan_events
  where loan_id = p_loan_id and kind = 'repayment';

  if p_amount <= 0 or p_amount < v_repaid then
    raise exception 'Origin amount cannot be reduced below total repayments' using errcode = '22023';
  end if;

  update loan_events set amount = p_amount, event_date = p_event_date
  where id = v_event.id
  returning * into v_event;

  update transactions
  set amount = p_amount, account_id = p_account_id, tx_date = p_event_date
  where loan_event_id = v_event.id
  returning * into v_tx;

  return query select
    v_event.id, v_event.owner_id, v_event.loan_id, v_event.kind, v_event.amount,
    v_event.event_date, v_event.created_at,
    v_tx.id, v_tx.owner_id, v_tx.type, v_tx.amount, v_tx.account_id,
    v_tx.cash_flow_direction, v_tx.loan_event_id, v_tx.merchant, v_tx.tx_date, v_tx.created_at;
end;
$$;

CREATE FUNCTION public.close_loan(p_owner_id uuid, p_loan_id uuid, p_kind text, p_event_date date) RETURNS TABLE(
    event_id uuid, event_owner_id uuid, event_loan_id uuid, event_kind text, event_amount bigint,
    event_event_date date, event_created_at timestamp with time zone
)
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$
declare
  v_loan loans%rowtype;
  v_origin_amount bigint;
  v_repaid bigint;
  v_outstanding bigint;
  v_event loan_events%rowtype;
begin
  if p_kind not in ('write_off', 'forgiveness') then
    raise exception 'Invalid closing kind' using errcode = '22023';
  end if;

  select * into v_loan from loans where id = p_loan_id and owner_id = p_owner_id for update;
  if not found then
    raise exception 'Loan not found' using errcode = 'P0002';
  end if;

  if (p_kind = 'write_off' and v_loan.direction <> 'lending')
    or (p_kind = 'forgiveness' and v_loan.direction <> 'borrowing') then
    raise exception 'Closing kind does not match loan direction' using errcode = '22023';
  end if;

  if exists (
    select 1 from loan_events
    where loan_id = p_loan_id and kind in ('write_off', 'forgiveness')
  ) then
    raise exception 'Loan is already closed' using errcode = '22023';
  end if;

  select amount into v_origin_amount from loan_events
  where loan_id = p_loan_id and kind in ('disbursement', 'opening');

  select coalesce(sum(amount), 0) into v_repaid from loan_events
  where loan_id = p_loan_id and kind = 'repayment';

  v_outstanding := v_origin_amount - v_repaid;

  if v_outstanding <= 0 then
    raise exception 'Loan has no outstanding balance to close' using errcode = '22023';
  end if;

  insert into loan_events (owner_id, loan_id, kind, amount, event_date)
  values (p_owner_id, p_loan_id, p_kind, v_outstanding, p_event_date)
  returning * into v_event;

  return query select
    v_event.id, v_event.owner_id, v_event.loan_id, v_event.kind, v_event.amount,
    v_event.event_date, v_event.created_at;
end;
$$;

-- migrate:down

DROP FUNCTION IF EXISTS public.close_loan(uuid, uuid, text, date);
DROP FUNCTION IF EXISTS public.update_loan_disbursement(uuid, uuid, bigint, uuid, date);
DROP FUNCTION IF EXISTS public.update_loan_repayment(uuid, uuid, bigint, uuid, date);
DROP FUNCTION IF EXISTS public.create_loan_repayment(uuid, uuid, bigint, uuid, date);
DROP FUNCTION IF EXISTS public.create_disbursed_loan(uuid, uuid, text, text, bigint, uuid, date, date, text);
DROP FUNCTION IF EXISTS public.create_opening_loan(uuid, uuid, text, text, bigint, date, date, date, text);
DROP FUNCTION IF EXISTS public.log_subscription(uuid, uuid, text, numeric, uuid, uuid, text, text, date, date);
DROP FUNCTION IF EXISTS public.create_transfer_with_fee(uuid, bigint, uuid, uuid, text, text, date, time, text, bigint);
DROP FUNCTION IF EXISTS public.reorder_accounts(uuid, uuid[]);
-- The two trigger functions below drop after every table: each table's own trigger is
-- what depends on its function, and a trigger can't outlive the function it invokes.
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.loan_events;
DROP TABLE IF EXISTS public.loans;
DROP TABLE IF EXISTS public.loan_people;
DROP TABLE IF EXISTS public.category_favorites;
DROP TABLE IF EXISTS public.category_translations;
-- `budgets` must drop before `categories`: budgets_category_id_fkey references it.
DROP TABLE IF EXISTS public.budgets;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.accounts;
DROP FUNCTION IF EXISTS public.categories_validate_hierarchy();
DROP FUNCTION IF EXISTS public.set_account_display_order();
