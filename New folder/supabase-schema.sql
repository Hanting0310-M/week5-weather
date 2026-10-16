-- ============================================================
-- Todo List app — Supabase RLS policies
-- Run this in the Supabase SQL Editor.
--
-- Your existing `todos` table has RLS enabled but is missing
-- insert/update/delete policies. This adds them so the app
-- can save, edit, and delete todos.
--
-- (This does NOT drop your table — it only adds policies.)
-- ============================================================

-- Add insert policy (so the app can save new todos)
create policy if not exists "Public insert access"
  on public.todos for insert
  with check (true);

-- Add update policy (so the app can edit todo text)
create policy if not exists "Public update access"
  on public.todos for update
  using (true);

-- Add delete policy (so the app can remove todos)
create policy if not exists "Public delete access"
  on public.todos for delete
  using (true);

-- Add read policy (in case it's missing)
create policy if not exists "Public read access"
  on public.todos for select
  using (true);
