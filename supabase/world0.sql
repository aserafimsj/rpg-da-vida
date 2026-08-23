-- ============================================================
--  QuesTAH World 0 — portal e pareamento
--
--  Cole tudo isto no SQL Editor do Supabase e clique em "Run".
--  Pode rodar mais de uma vez sem problema.
--
--  Esta migração é ADITIVA: cria UMA tabela nova, usada só pelo
--  portal. Nenhuma tabela existente é tocada, nenhum dado do seu
--  jogo é alterado.
-- ============================================================

-- Pareamentos entre o computador e o celular.
-- Nada aqui é permanente: as linhas são efêmeras e descartáveis.
create table if not exists public.world_pareamentos (
  codigo           text primary key,   -- vai no QR; aleatório, curto
  numero           text not null,      -- 4 dígitos mostrados na tela do PC
  segredo_hash     text not null,      -- hash do segredo que SÓ o PC conhece
  user_id          uuid references auth.users (id) on delete cascade,  -- null até confirmar
  pc_descricao     text,               -- "Chrome no Windows", para a tela de confirmação
  criado_em        timestamptz not null default now(),
  expira_em        timestamptz not null,
  confirmado_em    timestamptz,
  cancelado_em     timestamptz,
  token_hash       text,               -- hash do token de sessão do World
  token_expira_em  timestamptz,
  revogado_em      timestamptz,
  tentativas       int not null default 0
);

create index if not exists world_pareamentos_user_idx on public.world_pareamentos (user_id);
create index if not exists world_pareamentos_expira_idx on public.world_pareamentos (expira_em);

-- ------------------------------------------------------------
--  Segurança
--
--  Esta tabela é manipulada EXCLUSIVAMENTE pelas rotas de API do
--  QuesTAH, que rodam no servidor com a chave de serviço. Nenhum
--  navegador — nem do celular, nem do PC — fala com ela direto.
--
--  Com RLS ligada e sem nenhuma política de acesso, o resultado é
--  "ninguém do lado do cliente enxerga nada", que é exatamente o
--  que queremos. A chave de serviço passa por cima da RLS por
--  natureza, e ela só existe no servidor.
-- ------------------------------------------------------------
alter table public.world_pareamentos enable row level security;

-- Remove qualquer política que porventura exista (idempotência)
drop policy if exists "world_pareamentos_select_own" on public.world_pareamentos;
drop policy if exists "world_pareamentos_insert_own" on public.world_pareamentos;
drop policy if exists "world_pareamentos_update_own" on public.world_pareamentos;
drop policy if exists "world_pareamentos_delete_own" on public.world_pareamentos;

-- ------------------------------------------------------------
--  Faxina: pareamentos velhos não servem para nada.
--  Chamada pelas próprias rotas de API de vez em quando.
-- ------------------------------------------------------------
create or replace function public.world_limpar_pareamentos()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.world_pareamentos
  where (token_expira_em is not null and token_expira_em < now() - interval '1 day')
     or (token_expira_em is null and expira_em < now() - interval '1 day');
$$;

-- ============================================================
--  Pronto. O seu jogo continua exatamente como estava.
-- ============================================================
