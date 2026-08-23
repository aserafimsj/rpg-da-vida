import { NextResponse } from "next/server";
import { admin, usuarioDoToken } from "@/lib/worldAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O celular confirma: "sim, sou eu, pode abrir o portal".
 *
 * É o único ponto em que um pareamento ganha dono. Exige a sessão do
 * QuesTAH no celular — anônima ou por e-mail, tanto faz — e é de USO ÚNICO:
 * um código já confirmado não confirma de novo.
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
      .from("world_pareamentos").select("*").eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    if (!p) return NextResponse.json({ status: "inexistente" }, { status: 404 });
    if (p.cancelado_em) return NextResponse.json({ status: "cancelado" }, { status: 409 });
    if (p.confirmado_em) return NextResponse.json({ status: "ja_confirmado" }, { status: 409 });
    if (new Date(p.expira_em).getTime() < Date.now()) {
      return NextResponse.json({ status: "expirado" }, { status: 410 });
    }

    const { error: e2 } = await sb.from("world_pareamentos")
      .update({ user_id: usuario.id, confirmado_em: new Date().toISOString() })
      .eq("codigo", codigo)
      .is("confirmado_em", null);   // trava de corrida: só confirma uma vez
    if (e2) throw e2;

    return NextResponse.json({ status: "confirmado" });
  } catch (e: any) {
    return NextResponse.json({ erro: "falha", detalhe: e?.message }, { status: 500 });
  }
}
