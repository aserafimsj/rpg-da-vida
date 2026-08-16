import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Acesso às tabelas da Fase 3 (categorias, missoes, conclusoes).
 *
 * Regra de ouro desta fase: o jogo NUNCA trava por causa do banco.
 * O save em JSON continua sendo o caminho que não pode falhar; tudo aqui
 * é espelho. Por isso toda escrita é "fire-and-forget" com retry simples
 * e jamais propaga exceção para a interface.
 */

/* ---------- Flag de leitura (virada controlada pelo dono do projeto) ---------- */
const FLAG = process.env.NEXT_PUBLIC_LEITURA_TABELAS;
export const lendoDasTabelas = (): boolean =>
  FLAG === "1" || String(FLAG).toLowerCase() === "true";

/* ---------- Tipos frouxos: o save é JS puro, não vale brigar com ele ---------- */
type Qualquer = Record<string, any>;

/* ---------- Execução tolerante a falha ---------- */
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Roda a operação, tenta de novo algumas vezes e desiste em silêncio. */
async function semFalhar<T>(
  rotulo: string,
  fn: () => Promise<T>,
  tentativas = 3
): Promise<T | null> {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tentativas - 1) {
        if (typeof console !== "undefined") console.warn(`[gamedb] ${rotulo} falhou:`, e);
        return null;
      }
      await espera(400 * Math.pow(2, i)); // 400ms, 800ms
    }
  }
  return null;
}

/** Envolve chamadas do supabase-js, que devolvem { data, error } em vez de lançar. */
async function ok<T>(p: PromiseLike<{ data: T; error: any }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

/* ---------- Conversões JSON <-> linha ---------- */
export function categoriaParaLinha(c: Qualquer, userId: string) {
  return {
    id: String(c.id),
    user_id: userId,
    nome: c.nome ?? "Aventura",
    emoji: c.emoji ?? "⚔️",
    cor: c.cor ?? "#e8b339",
    ordem: typeof c.ordem === "number" ? c.ordem : 0,
    ativa: c.ativa !== false,
    sistema: c.sistema === "pet" || c.sistema === "saude" ? c.sistema : null,
    updated_at: new Date().toISOString(),
  };
}
export function linhaParaCategoria(r: Qualquer) {
  return {
    id: r.id,
    nome: r.nome,
    emoji: r.emoji,
    cor: r.cor,
    ordem: r.ordem,
    ativa: r.ativa,
    sistema: r.sistema ?? null,
  };
}

export function missaoParaLinha(t: Qualquer, userId: string) {
  const dif = ["rapida", "normal", "epica"].includes(t.dificuldade) ? t.dificuldade : "normal";
  return {
    id: String(t.id),
    user_id: userId,
    categoria_id: t.category ?? null,
    nome: t.name ?? "Missão",
    descricao: t.desc ?? "",
    xp: Number(t.xp) || 0,
    ouro: Number(t.xp) || 0, // hoje o ouro acompanha o XP 1:1
    icone: t.icon ?? null,
    cor: t.color ?? null,
    dificuldade: dif,
    recorrencia: t.recorrencia ?? { tipo: "sempre" },
    need: t.need ?? null,
    key: t.key ?? null,
    ativa: true,
    updated_at: new Date().toISOString(),
  };
}
export function linhaParaMissao(r: Qualquer) {
  const t: Qualquer = {
    id: r.id,
    category: r.categoria_id,
    name: r.nome,
    desc: r.descricao || "",
    xp: r.xp,
    dificuldade: r.dificuldade,
    recorrencia: r.recorrencia || { tipo: "sempre" },
  };
  if (r.icone) t.icon = r.icone;
  if (r.cor) t.color = r.cor;
  if (r.need) t.need = r.need;
  if (r.key) t.key = r.key;
  // `days` legado é reconstruído para as telas que ainda o leem
  if (r.recorrencia && r.recorrencia.tipo === "dias_semana" && Array.isArray(r.recorrencia.dias)) {
    t.days = r.recorrencia.dias;
  }
  return t;
}

/* ---------- Leitura ---------- */
export async function listarCategorias(supabase: SupabaseClient, userId: string) {
  const linhas = await semFalhar("listarCategorias", () =>
    ok<Qualquer[]>(supabase.from("categorias").select("*").eq("user_id", userId).order("ordem"))
  );
  return (linhas || []).map(linhaParaCategoria);
}

export async function listarMissoes(supabase: SupabaseClient, userId: string) {
  const linhas = await semFalhar("listarMissoes", () =>
    ok<Qualquer[]>(supabase.from("missoes").select("*").eq("user_id", userId).eq("ativa", true))
  );
  return (linhas || []).map(linhaParaMissao);
}

/** Contagens para o painel de paridade. `null` = não deu para consultar. */
export async function contarTudo(supabase: SupabaseClient, userId: string) {
  const conta = async (tabela: string) => {
    const r = await semFalhar(`contar:${tabela}`, async () => {
      const { count, error } = await supabase
        .from(tabela)
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count ?? 0;
    }, 2);
    return r;
  };
  const [categorias, missoes, conclusoes] = await Promise.all([
    conta("categorias"), conta("missoes"), conta("conclusoes"),
  ]);
  return { categorias, missoes, conclusoes };
}

/** Ids presentes no banco — usado para apontar exatamente o que falta. */
export async function idsNoBanco(supabase: SupabaseClient, userId: string) {
  const pega = async (tabela: string) => {
    const linhas = await semFalhar(`ids:${tabela}`, () =>
      ok<Qualquer[]>(supabase.from(tabela).select("id").eq("user_id", userId)), 2);
    return (linhas || []).map((l) => l.id);
  };
  const [categorias, missoes] = await Promise.all([pega("categorias"), pega("missoes")]);
  return { categorias, missoes };
}

/* ---------- Escrita (sempre tolerante a falha) ---------- */
export async function salvarCategorias(supabase: SupabaseClient, userId: string, cats: Qualquer[]) {
  if (!cats?.length) return;
  await semFalhar("salvarCategorias", () =>
    ok(supabase.from("categorias").upsert(cats.map((c) => categoriaParaLinha(c, userId)), { onConflict: "user_id,id" }))
  );
}

export async function salvarMissoes(supabase: SupabaseClient, userId: string, tasks: Qualquer[]) {
  if (!tasks?.length) return;
  await semFalhar("salvarMissoes", () =>
    ok(supabase.from("missoes").upsert(tasks.map((t) => missaoParaLinha(t, userId)), { onConflict: "user_id,id" }))
  );
}

export async function apagarCategorias(supabase: SupabaseClient, userId: string, ids: string[]) {
  if (!ids?.length) return;
  await semFalhar("apagarCategorias", () =>
    ok(supabase.from("categorias").delete().eq("user_id", userId).in("id", ids))
  );
}

export async function apagarMissoes(supabase: SupabaseClient, userId: string, ids: string[]) {
  if (!ids?.length) return;
  await semFalhar("apagarMissoes", () =>
    ok(supabase.from("missoes").delete().eq("user_id", userId).in("id", ids))
  );
}

/**
 * Registra a conclusão do dia. A chave primária (user_id, missao_id, data)
 * é a própria trava anti-farm: repetir no mesmo dia não cria linha nova.
 */
export async function registrarConclusao(
  supabase: SupabaseClient,
  userId: string,
  entrada: { missaoId: string; data: string; xp: number; ouro: number }
) {
  await semFalhar("registrarConclusao", () =>
    ok(
      supabase.from("conclusoes").upsert(
        {
          user_id: userId,
          missao_id: entrada.missaoId,
          data: entrada.data,
          xp: entrada.xp,
          ouro: entrada.ouro,
          concluida_em: new Date().toISOString(),
        },
        { onConflict: "user_id,missao_id,data", ignoreDuplicates: true }
      )
    )
  );
}

/**
 * Backfill: popula as tabelas a partir do save. Idempotente — pode rodar
 * quantas vezes for, sem duplicar (o upsert usa a chave composta).
 * Roda para o dono do projeto e para qualquer usuário futuro, sem script.
 */
export async function backfill(
  supabase: SupabaseClient,
  userId: string,
  cats: Qualquer[],
  tasks: Qualquer[]
): Promise<boolean> {
  const atual = await contarTudo(supabase, userId);
  if (atual.categorias === null) return false; // sem banco agora; tenta no próximo load
  const precisa =
    (atual.categorias ?? 0) < (cats?.length || 0) || (atual.missoes ?? 0) < (tasks?.length || 0);
  if (!precisa) return true;
  // categorias primeiro: as missões têm chave estrangeira para elas
  await salvarCategorias(supabase, userId, cats || []);
  await salvarMissoes(supabase, userId, tasks || []);
  return true;
}

/** Usado por "Recomeçar aventura": sem isto, o backfill ressuscitaria o jogo antigo. */
export async function limparTudoDoUsuario(supabase: SupabaseClient, userId: string) {
  await semFalhar("limparConclusoes", () =>
    ok(supabase.from("conclusoes").delete().eq("user_id", userId)));
  await semFalhar("limparMissoes", () =>
    ok(supabase.from("missoes").delete().eq("user_id", userId)));
  await semFalhar("limparCategorias", () =>
    ok(supabase.from("categorias").delete().eq("user_id", userId)));
}
