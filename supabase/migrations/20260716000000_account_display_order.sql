alter table accounts
add column display_order integer;

with ordered_accounts as (
  select
    id,
    row_number() over (
      partition by owner_id
      order by created_at asc, id asc
    ) - 1 as display_order
  from accounts
)
update accounts
set display_order = ordered_accounts.display_order
from ordered_accounts
where accounts.id = ordered_accounts.id;

alter table accounts
alter column display_order set not null;

alter table accounts
add constraint accounts_display_order_nonnegative check (display_order >= 0);

create index accounts_owner_active_display_order_idx
on accounts (owner_id, archived, display_order, created_at, id);

create or replace function set_account_display_order()
returns trigger
language plpgsql
as $$
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

create trigger accounts_set_display_order
before insert on accounts
for each row
execute function set_account_display_order();

create or replace function reorder_accounts(
  p_owner_id uuid,
  p_account_ids uuid[]
)
returns void
language plpgsql
as $$
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

revoke execute on function reorder_accounts(uuid, uuid[]) from public, anon, authenticated;
grant execute on function reorder_accounts(uuid, uuid[]) to service_role;

revoke execute on function set_account_display_order() from public, anon, authenticated;
