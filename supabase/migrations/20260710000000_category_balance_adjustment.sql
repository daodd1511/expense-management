alter table categories
  add column is_hidden boolean not null default false;

insert into categories (owner_id, name, icon, color, type, is_hidden) values
  (null, 'Balance Adjustment', 'Scale', 'chart-12', 'expense', true),
  (null, 'Balance Adjustment', 'Scale', 'chart-12', 'income', true);
