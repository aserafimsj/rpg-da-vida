-- QuesTAH — tabela de inscrições de notificação push
-- Rode isto no Supabase: SQL Editor → New query → cole tudo → Run.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  enabled boolean not null default true,
  times text[] not null default array['08:00','14:00','20:00'],
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- segurança: cada pessoa só enxerga/mexe nas próprias inscrições
alter table public.push_subscriptions enable row level security;

drop policy if exists "subs_select_own" on public.push_subscriptions;
drop policy if exists "subs_insert_own" on public.push_subscriptions;
drop policy if exists "subs_update_own" on public.push_subscriptions;
drop policy if exists "subs_delete_own" on public.push_subscriptions;

create policy "subs_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "subs_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "subs_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id);
create policy "subs_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
