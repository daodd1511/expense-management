-- Category UX phase 2: explicit per-user category favorites.
--
-- Most categories are system-owned rows shared by every user (owner_id IS NULL), so a
-- boolean column directly on categories would make one user's favorite show as everyone's
-- favorite. A join table keyed by user_id keeps this correctly per-user.

create table category_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);
