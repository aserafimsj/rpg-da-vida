import { NextResponse } from "next/server";
import {
  admin, gerarCodigo, gerarNumero, gerarSegredo, hash, descreverPc,
  PAREAMENTO_VALIDADE_MS,
} from "@/lib/worldAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O PC abre um portal.
 *
 * Devolve o código (que vai no QR), o número de segurança (que aparece na
 * tela e o celular confirma) e um segredo que SÓ este navegador conhece —
 * é ele que impede alguém com uma foto do QR de retirar o token.
 */
export async function POST(req: Request) {
  try {
    const sb = admin();
    const segredo = gerarSegredo();
    const codigo = gerarCodigo();
    const agora = Date.now();

    const { error } = await sb.from("world_pareamentos").insert({
      codigo,
      numero: gerarNumero(),
      segredo_hash: hash(segredo),
      pc_descricao: descreverPc(req.headers.get("user-agent")),
      expira_em: new Date(agora + PAREAMENTO_VALIDADE_MS).toISOString(),
    });
    if (error) throw error;

    // faxina oportunista dos pareamentos velhos
    sb.rpc("world_limpar_pareamentos").then(() => {}, () => {});

    const { data: linha } = await sb
      .from("world_pareamentos").select("numero").eq("codigo", codigo).maybeSingle();

    return NextResponse.json({
      codigo,
      numero: linha?.numero ?? null,
      segredo,                       // fica só na memória do PC
      expiraEm: new Date(agora + PAREAMENTO_VALIDADE_MS).toISOString(),
      validadeSegundos: Math.round(PAREAMENTO_VALIDADE_MS / 1000),
    });
  } catch (e: any) {
    return NextResponse.json({ erro: "falha_ao_abrir_portal", detalhe: e?.message }, { status: 500 });
  }
}
