-- ============================================================
--  RPG da Vida — schema do Supabase
--  Cole tudo isto no SQL Editor do Supabase e clique em "Run".
-- ============================================================

-- Tabela com 1 linha por usuário; o jogo inteiro vive no JSON `data`.
create table if not exists public.saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Liga o controle de acesso por linha (cada um só vê o próprio save).
alter table public.saves enable row level security;

-- Políticas: o dono pode ler/criar/atualizar a própria linha.
drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own"
  on public.saves for select
  using (auth.uid() = user_id);

drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own"
  on public.saves for insert
  with check (auth.uid() = user_id);

drop policy if exists "saves_update_own" on public.saves;
create policy "saves_update_own"
  on public.saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
