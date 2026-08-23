-- ============================================================
--  QuesTAH — Fase 4A: micro-etapas
--
--  Cole tudo isto no SQL Editor do Supabase e clique em "Run".
--  Pode rodar mais de uma vez sem problema.
--
--  Esta migração é ADITIVA: ela apenas acrescenta uma coluna nova
--  com valor padrão. Nenhuma coluna é apagada, nenhuma linha é
--  alterada, nenhum dado existente é tocado.
-- ============================================================

-- Cópia de segurança das missões antes da alteração (rede de proteção).
create table if not exists public.missoes_backup_fase4a as
  select * from public.missoes;

-- A lista de etapas de cada missão. Missão sem etapas fica com [] —
-- exatamente o comportamento de hoje, sem nenhuma diferença.
--
-- Cada etapa guarda só o essencial: { "id": "e1", "nome": "Recolher roupas" }.
-- O XP de cada etapa NÃO é guardado aqui de propósito: ele é sempre
-- calculado a partir do XP total da missão, para que quebrar uma missão
-- em partes nunca aumente o que ela vale.
alter table public.missoes
  add column if not exists etapas jsonb not null default '[]'::jsonb;

-- ============================================================
--  Pronto. Missões que já existiam continuam idênticas, agora com
--  uma lista de etapas vazia.
-- ============================================================
