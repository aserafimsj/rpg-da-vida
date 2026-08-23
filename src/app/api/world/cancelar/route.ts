import { NextResponse } from "next/server";
import { admin, usuarioDoToken } from "@/lib/worldAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O celular recusa o portal — ou revoga um que já tinha aberto.
 *
 * Cancelar antes de confirmar: o pareamento morre.
 * Revogar depois: a sessão do PC deixa de valer na hora.
 * Só o dono do pareamento pode revogar o próprio.
 */
export async function POST(req: Request) {
  try {
    const usuario = await usuarioDoToken(req.headers.get("authorization"));
    if (!usuario) return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });

    const corpo = await req.json().catch(() => ({}));
    const codigo = String(corpo?.codigo || "").toUpperCase();
    if (!codigo) return NextResponse.json({ erro: "codigo_ausente" }, { status: 400 });

    const sb = admin();
    const { data: p, error } = await sb
      .from("world_pareamentos").select("codigo, user_id, confirmado_em").eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    if (!p) return NextResponse.json({ status: "inexistente" }, { status: 404 });

    // já tem dono? só o dono mexe
    if (p.user_id && p.user_id !== usuario.id) {
      return NextResponse.json({ erro: "nao_e_seu" }, { status: 403 });
    }

    const agora = new Date().toISOString();
    const patch = p.confirmado_em ? { revogado_em: agora } : { cancelado_em: agora };
    const { error: e2 } = await sb.from("world_pareamentos").update(patch).eq("codigo", codigo);
    if (e2) throw e2;

    return NextResponse.json({ status: p.confirmado_em ? "revogado" : "cancelado" });
  } catch (e: any) {
    return NextResponse.json({ erro: "falha", detalhe: e?.message }, { status: 500 });
  }
}
