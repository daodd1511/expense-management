-- Category redesign phase 1: type + 2-level hierarchy.
-- Assumes categories.id is uuid (Supabase default convention); adjust if the
-- live schema differs.

-- No real user data exists yet (confirmed in specs/category-redesign/PLAN.md),
-- so the existing seed categories are hard-deleted rather than migrated.
-- Null out dependent references first to satisfy FKs, mirroring the app-layer
-- delete behavior in packages/api/src/routes/categories.ts.
update transactions set category_id = null where category_id is not null;
update subscriptions set category_id = null where category_id is not null;
delete from budgets;
delete from categories;

alter table categories
  add column type text,
  add column parent_id uuid references categories(id);

alter table categories
  alter column type set not null;

alter table categories
  add constraint categories_type_check check (type in ('expense', 'income'));

-- Enforces (per PLAN.md):
--   1. child.type must equal parent.type
--   2. parent_id target must itself have parent_id IS NULL (caps depth at 2 levels)
--   3. a category that already has children cannot itself receive a parent_id
-- Check constraints can't do cross-row lookups, so this needs a trigger.
create or replace function categories_validate_hierarchy()
returns trigger as $$
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
$$ language plpgsql;

drop trigger if exists categories_validate_hierarchy_trigger on categories;
create trigger categories_validate_hierarchy_trigger
  before insert or update on categories
  for each row
  execute function categories_validate_hierarchy();

-- Reseed: system categories (owner_id null), 12 expense parents + 4 income
-- parents, per specs/category-redesign/PLAN.md taxonomy table.
do $$
declare
  v_food uuid; v_transport uuid; v_housing uuid; v_bills uuid; v_fun uuid;
  v_dating uuid; v_health uuid; v_shopping uuid; v_education uuid; v_pet uuid;
  v_gifts uuid; v_other uuid;
  v_salary uuid; v_investment uuid; v_business uuid; v_other_income uuid;
begin
  insert into categories (name, icon, color, type) values
    ('Food & Dining', 'Utensils', 'chart-1', 'expense') returning id into v_food;
  insert into categories (name, icon, color, type) values
    ('Transport', 'Bus', 'chart-2', 'expense') returning id into v_transport;
  insert into categories (name, icon, color, type) values
    ('Housing', 'House', 'chart-3', 'expense') returning id into v_housing;
  insert into categories (name, icon, color, type) values
    ('Bills & Utilities', 'ReceiptText', 'chart-4', 'expense') returning id into v_bills;
  insert into categories (name, icon, color, type) values
    ('Entertainment', 'Gamepad2', 'chart-5', 'expense') returning id into v_fun;
  insert into categories (name, icon, color, type) values
    ('Dating', 'HeartHandshake', 'chart-6', 'expense') returning id into v_dating;
  insert into categories (name, icon, color, type) values
    ('Health', 'HeartPulse', 'chart-7', 'expense') returning id into v_health;
  insert into categories (name, icon, color, type) values
    ('Shopping', 'ShoppingBag', 'chart-8', 'expense') returning id into v_shopping;
  insert into categories (name, icon, color, type) values
    ('Education', 'GraduationCap', 'chart-9', 'expense') returning id into v_education;
  insert into categories (name, icon, color, type) values
    ('Pet', 'Dog', 'chart-10', 'expense') returning id into v_pet;
  insert into categories (name, icon, color, type) values
    ('Gifts & Charity', 'Gift', 'chart-11', 'expense') returning id into v_gifts;
  insert into categories (name, icon, color, type) values
    ('Other', 'Ellipsis', 'chart-12', 'expense') returning id into v_other;

  insert into categories (name, icon, color, type) values
    ('Salary', 'Briefcase', 'chart-1', 'income') returning id into v_salary;
  insert into categories (name, icon, color, type) values
    ('Investment', 'TrendingUp', 'chart-2', 'income') returning id into v_investment;
  insert into categories (name, icon, color, type) values
    ('Business', 'Store', 'chart-3', 'income') returning id into v_business;
  insert into categories (name, icon, color, type) values
    ('Other Income', 'CircleEllipsis', 'chart-4', 'income') returning id into v_other_income;

  insert into categories (name, icon, color, type, parent_id) values
    ('Restaurant', 'Utensils', 'chart-1', 'expense', v_food),
    ('Coffee', 'Utensils', 'chart-1', 'expense', v_food),
    ('Groceries', 'Utensils', 'chart-1', 'expense', v_food),
    ('Food Delivery', 'Utensils', 'chart-1', 'expense', v_food),
    ('C-Store', 'Utensils', 'chart-1', 'expense', v_food),

    ('Gas', 'Bus', 'chart-2', 'expense', v_transport),
    ('Grab/Taxi', 'Bus', 'chart-2', 'expense', v_transport),
    ('Parking', 'Bus', 'chart-2', 'expense', v_transport),
    ('Car Maintenance', 'Bus', 'chart-2', 'expense', v_transport),
    ('Public Transit', 'Bus', 'chart-2', 'expense', v_transport),

    ('Rent', 'House', 'chart-3', 'expense', v_housing),
    ('Repairs', 'House', 'chart-3', 'expense', v_housing),
    ('Furniture', 'House', 'chart-3', 'expense', v_housing),

    ('Electricity', 'ReceiptText', 'chart-4', 'expense', v_bills),
    ('Water', 'ReceiptText', 'chart-4', 'expense', v_bills),
    ('Internet', 'ReceiptText', 'chart-4', 'expense', v_bills),
    ('Phone', 'ReceiptText', 'chart-4', 'expense', v_bills),
    ('Streaming', 'ReceiptText', 'chart-4', 'expense', v_bills),

    ('Travel', 'Gamepad2', 'chart-5', 'expense', v_fun),
    ('Movies', 'Gamepad2', 'chart-5', 'expense', v_fun),
    ('Games', 'Gamepad2', 'chart-5', 'expense', v_fun),
    ('Books/Music', 'Gamepad2', 'chart-5', 'expense', v_fun),

    ('Food', 'HeartHandshake', 'chart-6', 'expense', v_dating),

    ('Doctor', 'HeartPulse', 'chart-7', 'expense', v_health),
    ('Medicine', 'HeartPulse', 'chart-7', 'expense', v_health),
    ('Health Insurance', 'HeartPulse', 'chart-7', 'expense', v_health),
    ('Gym', 'HeartPulse', 'chart-7', 'expense', v_health),
    ('Sports', 'HeartPulse', 'chart-7', 'expense', v_health),

    ('Clothing', 'ShoppingBag', 'chart-8', 'expense', v_shopping),
    ('Electronics', 'ShoppingBag', 'chart-8', 'expense', v_shopping),
    ('Cosmetics', 'ShoppingBag', 'chart-8', 'expense', v_shopping),
    ('Household Items', 'ShoppingBag', 'chart-8', 'expense', v_shopping),

    ('Tuition', 'GraduationCap', 'chart-9', 'expense', v_education),
    ('Books/Supplies', 'GraduationCap', 'chart-9', 'expense', v_education),
    ('Courses', 'GraduationCap', 'chart-9', 'expense', v_education),

    ('Pet Food', 'Dog', 'chart-10', 'expense', v_pet),
    ('Vet', 'Dog', 'chart-10', 'expense', v_pet),
    ('Grooming', 'Dog', 'chart-10', 'expense', v_pet),

    ('Gifts', 'Gift', 'chart-11', 'expense', v_gifts),
    ('Charity', 'Gift', 'chart-11', 'expense', v_gifts),

    ('Base Salary', 'Briefcase', 'chart-1', 'income', v_salary),
    ('Bonus', 'Briefcase', 'chart-1', 'income', v_salary),

    ('Savings Interest', 'TrendingUp', 'chart-2', 'income', v_investment),
    ('Dividends', 'TrendingUp', 'chart-2', 'income', v_investment),

    ('Sales Revenue', 'Store', 'chart-3', 'income', v_business),
    ('Freelance', 'Store', 'chart-3', 'income', v_business),

    ('Refund', 'CircleEllipsis', 'chart-4', 'income', v_other_income),
    ('Winnings', 'CircleEllipsis', 'chart-4', 'income', v_other_income),
    ('Gift Received', 'CircleEllipsis', 'chart-4', 'income', v_other_income);
end $$;
