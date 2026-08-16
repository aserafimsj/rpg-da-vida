import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O save do jogo é guardado como um único JSON por usuário,
 * na tabela `saves` (veja supabase/schema.sql). Ele continua sendo a
 * fonte da verdade do progresso (XP, ouro, streaks, monstrinho) mesmo
 * depois da Fase 3 — as tabelas novas são espelho de categorias e missões.
 */

export type SaveCarregado = {
  data: Record<string, unknown> | null;
  updatedAt: string | null;
};

export async function loadSave(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("saves")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.data as Record<string, unknown>) ?? null;
}

/** Igual ao loadSave, mas também devolve o carimbo de tempo do servidor. */
export async function loadSaveComVersao(
  supabase: SupabaseClient,
  userId: string
): Promise<SaveCarregado> {
  const { data, error } = await supabase
    .from("saves")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return {
    data: (data?.data as Record<string, unknown>) ?? null,
    updatedAt: (data?.updated_at as string) ?? null,
  };
}

export type ResultadoSave = {
  updatedAt: string;
  conflito: boolean;
};

/**
 * Grava o save. Se `versaoEsperada` for informada e o servidor já tiver uma
 * versão mais nova (outro aparelho gravou no meio do caminho), avisa através
 * de `conflito` — a gravação acontece de todo jeito, porque perder a jogada
 * que a pessoa acabou de fazer seria pior do que sobrescrever.
 */
export async function persistSave(
  supabase: SupabaseClient,
  userId: string,
  save: unknown,
  versaoEsperada?: string | null
): Promise<ResultadoSave> {
  let conflito = false;

  if (versaoEsperada) {
    const { data: atual } = await supabase
      .from("saves")
      .select("updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    const remoto = atual?.updated_at as string | undefined;
    if (remoto && remoto !== versaoEsperada) {
      conflito = true;
      if (typeof console !== "undefined") {
        console.warn(
          "[save] outra sessão gravou este save enquanto você jogava.",
          { esperado: versaoEsperada, encontrado: remoto }
        );
      }
    }
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("saves").upsert(
    {
      user_id: userId,
      data: save,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;

  return { updatedAt, conflito };
}
