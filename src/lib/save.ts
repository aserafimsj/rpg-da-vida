import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O save do jogo é guardado como um único JSON por usuário,
 * na tabela `saves` (veja supabase/schema.sql). Isso espelha o
 * modelo simples que o app já usava e sincroniza entre aparelhos.
 */

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

export async function persistSave(
  supabase: SupabaseClient,
  userId: string,
  save: unknown
): Promise<void> {
  const { error } = await supabase.from("saves").upsert(
    {
      user_id: userId,
      data: save,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}
