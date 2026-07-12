alter table transactions
  add column linked_transfer_id uuid references transactions(id) on delete cascade;

insert into categories (owner_id, name, icon, color, type, is_hidden) values
  (null, 'Transfer Fee', 'ArrowRightLeft', 'chart-12', 'expense', true);

create function create_transfer_with_fee(
  p_owner_id uuid, p_amount bigint, p_account_id uuid, p_to_account_id uuid,
  p_merchant text, p_note text, p_tx_date date, p_tx_time time, p_receipt_url text, p_fee bigint
)
returns setof transactions
language plpgsql
as $$
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
