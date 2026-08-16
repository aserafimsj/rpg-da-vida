-- ============================================================
--  QuesTAH — Fase 3: categorias, missões e conclusões no banco
--
--  Cole TUDO isto no SQL Editor do Supabase e clique em "Run".
--  Pode rodar mais de uma vez sem problema: tudo é idempotente.
--
--  A PRIMEIRA instrução faz uma CÓPIA DE SEGURANÇA dos seus saves.
--  Ela nunca é apagada por este arquivo.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Cópia de segurança do save atual (rede de proteção)
-- ------------------------------------------------------------
create table if not exists public.saves_backup_fase3 as
  select * from public.saves;

-- ------------------------------------------------------------
-- 1) Categorias
--    Os ids são os MESMOS do jogo ('pet', 'casa', 'cat_x9f2'...),
--    de propósito: o save já referencia esses ids em catCounts e
--    nas missões, então nada precisa ser reindexado.
-- ------------------------------------------------------------
create table if not exists public.categorias (
  id         text not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  nome       text not null,
  emoji      text not null default '⚔️',
  cor        text not null default '#e8b339',
  ordem      int  not null default 0,
  ativa      boolean not null default true,
  sistema    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint categorias_sistema_valido check (sistema is null or sistema in ('pet','saude'))
);

-- ------------------------------------------------------------
-- 2) Missões
-- ------------------------------------------------------------
create table if not exists public.missoes (
  id           text not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  categoria_id text,
  nome         text not null,
  descricao    text not null default '',
  xp           int  not null default 10,
  ouro         int  not null default 10,
  icone        text,
  cor          text,
  dificuldade  text not null default 'normal',
  recorrencia  jsonb not null default '{"tipo":"sempre"}'::jsonb,
  need         text,
  key          text,   -- preservada: a conquista "Guardião da Geladeira" depende dela
  ativa        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id),
  constraint missoes_dificuldade_valida check (dificuldade in ('rapida','normal','epica'))
);

-- Liga a missão à categoria do MESMO usuário. `on delete set null` porque
-- categoria nunca é apagada pelo app — mas se um dia for, a missão sobrevive.
alter table public.missoes drop constraint if exists missoes_categoria_fk;
alter table public.missoes
  add constraint missoes_categoria_fk
  foreign key (user_id, categoria_id)
  references public.categorias (user_id, id)
  on delete set null;

-- ------------------------------------------------------------
-- 3) Conclusões — o histórico que o JSON nunca teve
--    A chave primária é a própria regra anti-farm: uma conclusão
--    por missão por dia, garantida pelo banco.
-- ------------------------------------------------------------
create table if not exists public.conclusoes (
  user_id      uuid not null references auth.users (id) on delete cascade,
  missao_id    text not null,
  data         date not null,
  xp           int  not null default 0,
  ouro         int  not null default 0,
  concluida_em timestamptz not null default now(),
  primary key (user_id, missao_id, data)
);

-- ------------------------------------------------------------
-- 4) Índices
-- ------------------------------------------------------------
create index if not exists conclusoes_user_data_idx on public.conclusoes (user_id, data);
create index if not exists missoes_user_categoria_idx on public.missoes (user_id, categoria_id);

-- ------------------------------------------------------------
-- 5) Segurança por linha (cada pessoa só enxerga o que é seu)
-- ------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.missoes    enable row level security;
alter table public.conclusoes enable row level security;

-- categorias
drop policy if exists "categorias_select_own" on public.categorias;
drop policy if exists "categorias_insert_own" on public.categorias;
drop policy if exists "categorias_update_own" on public.categorias;
drop policy if exists "categorias_delete_own" on public.categorias;
create policy "categorias_select_own" on public.categorias
  for select using (auth.uid() = user_id);
create policy "categorias_insert_own" on public.categorias
  for insert with check (auth.uid() = user_id);
create policy "categorias_update_own" on public.categorias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categorias_delete_own" on public.categorias
  for delete using (auth.uid() = user_id);

-- missoes
drop policy if exists "missoes_select_own" on public.missoes;
drop policy if exists "missoes_insert_own" on public.missoes;
drop policy if exists "missoes_update_own" on public.missoes;
drop policy if exists "missoes_delete_own" on public.missoes;
create policy "missoes_select_own" on public.missoes
  for select using (auth.uid() = user_id);
create policy "missoes_insert_own" on public.missoes
  for insert with check (auth.uid() = user_id);
create policy "missoes_update_own" on public.missoes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "missoes_delete_own" on public.missoes
  for delete using (auth.uid() = user_id);

-- conclusoes
drop policy if exists "conclusoes_select_own" on public.conclusoes;
drop policy if exists "conclusoes_insert_own" on public.conclusoes;
drop policy if exists "conclusoes_update_own" on public.conclusoes;
drop policy if exists "conclusoes_delete_own" on public.conclusoes;
create policy "conclusoes_select_own" on public.conclusoes
  for select using (auth.uid() = user_id);
create policy "conclusoes_insert_own" on public.conclusoes
  for insert with check (auth.uid() = user_id);
create policy "conclusoes_update_own" on public.conclusoes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conclusoes_delete_own" on public.conclusoes
  for delete using (auth.uid() = user_id);

-- ============================================================
--  Pronto. Nada do seu save foi alterado: as tabelas nascem
--  vazias e o próprio app as preenche no próximo acesso.
-- ============================================================
