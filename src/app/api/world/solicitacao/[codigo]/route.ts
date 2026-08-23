import { NextResponse } from "next/server";
import { admin, usuarioDoToken } from "@/lib/worldAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O celular pergunta: "o que é este portal que acabei de escanear?"
 *
 * Exige o login do celular — só quem está autenticado no QuesTAH consegue
 * ver que existe um pedido, e nunca vazamos nada além do necessário para
 * a pessoa decidir: o número de segurança e qual computador pediu.
 */
export async function GET(req: Request, { params }: { params: { codigo: string } }) {
  try {
    const usuario = await usuarioDoToken(req.headers.get("authorization"));
    if (!usuario) return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });

    const codigo = String(params.codigo || "").toUpperCase();
    const sb = admin();
    const { data: p, error } = await sb
      .from("world_pareamentos")
      .select("codigo, numero, pc_descricao, expira_em, confirmado_em, cancelado_em")
      .eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    if (!p) return NextResponse.json({ status: "inexistente" }, { status: 404 });

    if (p.cancelado_em) return NextResponse.json({ status: "cancelado" });
    if (p.confirmado_em) return NextResponse.json({ status: "ja_confirmado" });
    if (new Date(p.expira_em).getTime() < Date.now()) return NextResponse.json({ status: "expirado" });

    return NextResponse.json({
      status: "aguardando",
      numero: p.numero,
      computador: p.pc_descricao,
      expiraEm: p.expira_em,
    });
  } catch (e: any) {
    return NextResponse.json({ erro: "falha", detalhe: e?.message }, { status: 500 });
  }
}
