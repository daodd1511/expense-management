-- log_subscription (20260705061832) declared tx_amount/sub_amount as numeric in its
-- RETURNS TABLE, but transactions.amount and subscriptions.amount are bigint columns.
-- Postgres enforces exact RETURN QUERY column-type matches, so every call failed with
-- "structure of query does not match function result type" (bigint vs numeric).
-- Re-creates the function unchanged except for those two column types.
-- Postgres refuses `create or replace` when OUT-parameter types change (42P13),
-- so the old signature must be dropped first.

drop function if exists log_subscription(uuid, uuid, text, numeric, uuid, uuid, text, text, date, date);

create function log_subscription(
  p_owner_id uuid,
  p_subscription_id uuid,
  p_type text,
  p_amount numeric,
  p_category_id uuid,
  p_account_id uuid,
  p_merchant text,
  p_note text,
  p_tx_date date,
  p_next_due_date date
)
returns table (
  tx_id uuid,
  tx_owner_id uuid,
  tx_type text,
  tx_amount bigint,
  tx_category_id uuid,
  tx_account_id uuid,
  tx_to_account_id uuid,
  tx_merchant text,
  tx_note text,
  tx_tx_date date,
  tx_receipt_url text,
  tx_subscription_id uuid,
  tx_created_at timestamptz,
  sub_id uuid,
  sub_owner_id uuid,
  sub_name text,
  sub_amount bigint,
  sub_type text,
  sub_category_id uuid,
  sub_account_id uuid,
  sub_cadence text,
  sub_day_of_month int,
  sub_month_of_year int,
  sub_next_due_date date,
  sub_note text,
  sub_active boolean,
  sub_created_at timestamptz
)
language plpgsql
as $$
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
