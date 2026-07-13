-- Personal loans phase 1: authoritative loan/event ledger, linked transaction fields,
-- and ownership-validating RPCs for every multi-row loan mutation (ADR 0006).
--
-- No RLS: this project enforces ownership entirely at the API layer (repository queries
-- scope by owner_id; the API always connects with the service-role key, which bypasses
-- RLS anyway) — matching every other owned table (accounts, categories, transactions,
-- subscriptions). The RPCs below re-validate owner_id server-side since they run under
-- the service role and must not trust client-supplied ids blindly.

create table loan_people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  note text,
  created_at timestamptz not null default now()
);

create index loan_people_owner_id_idx on loan_people(owner_id);

create table loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  person_id uuid not null references loan_people(id),
  direction text not null check (direction in ('lending', 'borrowing')),
  description text,
  note text,
  due_date date,
  original_date date,
  created_at timestamptz not null default now()
);

create index loans_owner_person_idx on loans(owner_id, person_id);
create index loans_owner_due_date_idx on loans(owner_id, due_date) where due_date is not null;

create table loan_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  loan_id uuid not null references loans(id) on delete cascade,
  kind text not null check (kind in ('disbursement', 'opening', 'repayment', 'write_off', 'forgiveness')),
  amount bigint not null check (amount > 0),
  event_date date not null,
  created_at timestamptz not null default now()
);

create index loan_events_owner_loan_idx on loan_events(owner_id, loan_id);

-- Exactly one disbursement or opening origin per loan.
create unique index loan_events_one_origin_idx on loan_events(loan_id)
  where kind in ('disbursement', 'opening');

-- At most one active closing event per loan. Reopening deletes the closing event row
-- (see reopen handling in the repository), so this never needs a partial-active flag.
create unique index loan_events_one_closing_idx on loan_events(loan_id)
  where kind in ('write_off', 'forgiveness');

-- loans.person_id's inline `references loan_people(id)` above already restricts
-- loan_people deletion while referenced (default FK behavior, no ON DELETE clause),
-- raising a foreign_key_violation the API's existing 23503 -> 409 mapping already handles.

alter table transactions
  add column cash_flow_direction text check (cash_flow_direction in ('inflow', 'outflow')),
  add column loan_event_id uuid references loan_events(id) on delete cascade;

create unique index transactions_loan_event_id_key on transactions(loan_event_id)
  where loan_event_id is not null;

-- The baseline schema's transactions_type_check predates this migration and only allows
-- expense/income/transfer; widen it to admit 'loan'.
alter table transactions drop constraint transactions_type_check;
alter table transactions
  add constraint transactions_type_check check (type in ('expense', 'income', 'transfer', 'loan'));

-- type = 'loan' rows must carry direction + event link and have no category/destination
-- account; every other type must have neither loan-only field set.
alter table transactions
  add constraint transactions_loan_fields_check check (
    (
      type = 'loan'
      and cash_flow_direction is not null
      and loan_event_id is not null
      and category_id is null
      and to_account_id is null
    )
    or (
      type <> 'loan'
      and cash_flow_direction is null
      and loan_event_id is null
    )
  );

-- Creates a disbursed loan: Loan + origin (disbursement) Event + linked Transaction in
-- one operation. cash_flow_direction is outflow for lending, inflow for borrowing.
create function create_disbursed_loan(
  p_owner_id uuid,
  p_person_id uuid,
  p_direction text,
  p_description text,
  p_amount bigint,
  p_account_id uuid,
  p_event_date date,
  p_due_date date,
  p_note text
)
returns table (
  loan_id uuid,
  loan_owner_id uuid,
  loan_person_id uuid,
  loan_direction text,
  loan_description text,
  loan_note text,
  loan_due_date date,
  loan_original_date date,
  loan_created_at timestamptz,
  event_id uuid,
  event_owner_id uuid,
  event_loan_id uuid,
  event_kind text,
  event_amount bigint,
  event_event_date date,
  event_created_at timestamptz,
  tx_id uuid,
  tx_owner_id uuid,
  tx_type text,
  tx_amount bigint,
  tx_account_id uuid,
  tx_cash_flow_direction text,
  tx_loan_event_id uuid,
  tx_merchant text,
  tx_tx_date date,
  tx_created_at timestamptz
)
language plpgsql
as $$
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

-- Creates an opening loan: Loan + opening Event, no Transaction (predates cash tracking).
create function create_opening_loan(
  p_owner_id uuid,
  p_person_id uuid,
  p_direction text,
  p_description text,
  p_amount bigint,
  p_balance_as_of date,
  p_original_date date,
  p_due_date date,
  p_note text
)
returns table (
  loan_id uuid,
  loan_owner_id uuid,
  loan_person_id uuid,
  loan_direction text,
  loan_description text,
  loan_note text,
  loan_due_date date,
  loan_original_date date,
  loan_created_at timestamptz,
  event_id uuid,
  event_owner_id uuid,
  event_loan_id uuid,
  event_kind text,
  event_amount bigint,
  event_event_date date,
  event_created_at timestamptz
)
language plpgsql
as $$
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

-- Adds a partial repayment: validates the amount against the outstanding balance (row-locked
-- to prevent concurrent repayments from overpaying), then inserts the repayment Event and
-- its linked Transaction atomically.
create function create_loan_repayment(
  p_owner_id uuid,
  p_loan_id uuid,
  p_amount bigint,
  p_account_id uuid,
  p_event_date date
)
returns table (
  event_id uuid,
  event_owner_id uuid,
  event_loan_id uuid,
  event_kind text,
  event_amount bigint,
  event_event_date date,
  event_created_at timestamptz,
  tx_id uuid,
  tx_owner_id uuid,
  tx_type text,
  tx_amount bigint,
  tx_account_id uuid,
  tx_cash_flow_direction text,
  tx_loan_event_id uuid,
  tx_merchant text,
  tx_tx_date date,
  tx_created_at timestamptz
)
language plpgsql
as $$
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

-- Updates a repayment's amount/date/account: re-validates against the outstanding balance
-- (excluding this repayment's own current amount), then mutates Event + Transaction atomically.
create function update_loan_repayment(
  p_owner_id uuid,
  p_event_id uuid,
  p_amount bigint,
  p_account_id uuid,
  p_event_date date
)
returns table (
  event_id uuid,
  event_owner_id uuid,
  event_loan_id uuid,
  event_kind text,
  event_amount bigint,
  event_event_date date,
  event_created_at timestamptz,
  tx_id uuid,
  tx_owner_id uuid,
  tx_type text,
  tx_amount bigint,
  tx_account_id uuid,
  tx_cash_flow_direction text,
  tx_loan_event_id uuid,
  tx_merchant text,
  tx_tx_date date,
  tx_created_at timestamptz
)
language plpgsql
as $$
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

-- Edits the origin (disbursement) event's financial fields: amount, account, and date.
-- Amount cannot be reduced below total repayments already recorded.
create function update_loan_disbursement(
  p_owner_id uuid,
  p_loan_id uuid,
  p_amount bigint,
  p_account_id uuid,
  p_event_date date
)
returns table (
  event_id uuid,
  event_owner_id uuid,
  event_loan_id uuid,
  event_kind text,
  event_amount bigint,
  event_event_date date,
  event_created_at timestamptz,
  tx_id uuid,
  tx_owner_id uuid,
  tx_type text,
  tx_amount bigint,
  tx_account_id uuid,
  tx_cash_flow_direction text,
  tx_loan_event_id uuid,
  tx_merchant text,
  tx_tx_date date,
  tx_created_at timestamptz
)
language plpgsql
as $$
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

-- Closes all remaining outstanding balance as a write-off (lending) or forgiveness
-- (borrowing) — a non-cash event; no linked transaction. Amount is fixed to the
-- outstanding balance immediately before closure, preserving historical net-worth math.
create function close_loan(
  p_owner_id uuid,
  p_loan_id uuid,
  p_kind text,
  p_event_date date
)
returns table (
  event_id uuid,
  event_owner_id uuid,
  event_loan_id uuid,
  event_kind text,
  event_amount bigint,
  event_event_date date,
  event_created_at timestamptz
)
language plpgsql
as $$
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
