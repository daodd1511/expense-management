alter table budgets
add column scope text not null default 'self'
check (scope in ('self', 'tree'));

alter table budgets
add constraint budgets_owner_category_unique unique (owner_id, category_id);
