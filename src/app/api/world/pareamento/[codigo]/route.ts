import { NextResponse } from "next/server";
import { admin, hash, iguais, gerarSegredo, TOKEN_VALIDADE_MS, MAX_TENTATIVAS } from "@/lib/worldAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O PC pergunta como está o pareamento.
 *
 * Só devolve o token para quem apresentar o segredo registrado na abertura
 * do portal. Alguém que fotografou o QR tem o código, mas não tem o segredo —
 * e sem ele o código é inútil.
 */
export async function GET(req: Request, { params }: { params: { codigo: string } }) {
  try {
    const codigo = String(params.codigo || "").toUpperCase();
    const segredo = req.headers.get("x-world-segredo") || "";
    const sb = admin();

    const { data: p, error } = await sb
      .from("world_pareamentos").select("*").eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    if (!p) return NextResponse.json({ status: "inexistente" }, { status: 404 });

    if (p.tentativas >= MAX_TENTATIVAS) {
      return NextResponse.json({ status: "bloqueado" }, { status: 429 });
    }
    if (!iguais(hash(segredo), p.segredo_hash || "")) {
      await sb.from("world_pareamentos")
        .update({ tentativas: (p.tentativas || 0) + 1 }).eq("codigo", codigo);
      return NextResponse.json({ status: "negado" }, { status: 403 });
    }

    if (p.cancelado_em) return NextResponse.json({ status: "cancelado" });
    if (p.revogado_em) return NextResponse.json({ status: "revogado" });

    if (!p.confirmado_em) {
      if (new Date(p.expira_em).getTime() < Date.now()) {
        return NextResponse.json({ status: "expirado" });
      }
      return NextResponse.json({ status: "aguardando" });
    }

    // confirmado: entrega (ou reentrega) o token enquanto ele valer
    if (p.token_expira_em && new Date(p.token_expira_em).getTime() < Date.now()) {
      return NextResponse.json({ status: "sessao_expirada" });
    }
    const token = gerarSegredo();
    const validade = new Date(Date.now() + TOKEN_VALIDADE_MS).toISOString();
    const { error: e2 } = await sb.from("world_pareamentos")
      .update({ token_hash: hash(token), token_expira_em: validade })
      .eq("codigo", codigo);
    if (e2) throw e2;

    return NextResponse.json({ status: "confirmado", token, tokenExpiraEm: validade });
  } catch (e: any) {
    return NextResponse.json({ erro: "falha", detalhe: e?.message }, { status: 500 });
  }
}
