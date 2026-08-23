import { NextResponse } from "next/server";
import { admin, usuarioDaSessaoWorld } from "@/lib/worldAuth";
import { levelFromXp, calcAtributos } from "@/lib/regras";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O CONTRATO entre o QuesTAH e o QuesTAH World.
 *
 * O formato do save mudou em todas as cinco fases. Se o World lesse o JSONB
 * cru, quebraria na próxima. Por isso esta rota TRADUZ o estado interno num
 * formato estável e versionado: o World nunca vê `catCounts`, `tama` ou
 * qualquer nome interno.
 *
 * Somente leitura. O World 0 não escreve nada.
 */
/** Versão do contrato. Muda só quando a forma quebra compatibilidade. */
const CONTRATO = 1;

/** Nível de desenvolvimento da região (0–100), com a mesma curva dos atributos. */
function desenvolvimento(conclusoes: number) {
  const n = Math.max(0, conclusoes || 0);
  return Math.min(100, Math.round(Math.sqrt(n / 200) * 100));
}

export async function GET(req: Request) {
  try {
    const userId = await usuarioDaSessaoWorld(req.headers.get("authorization"));
    if (!userId) return NextResponse.json({ erro: "sessao_invalida" }, { status: 401 });

    const sb = admin();
    const [saveRes, catsRes, missoesRes] = await Promise.all([
      sb.from("saves").select("data").eq("user_id", userId).maybeSingle(),
      sb.from("categorias").select("*").eq("user_id", userId).order("ordem"),
      sb.from("missoes").select("id, categoria_id, nome, xp, dificuldade, etapas, ativa").eq("user_id", userId).eq("ativa", true),
    ]);

    const d: any = saveRes.data?.data || {};
    const cats: any[] = catsRes.data || [];
    const missoes: any[] = missoesRes.data || [];
    const { level, xpInLevel, xpForNext } = levelFromXp(d.xpTotal || 0);
    const perfil = (d.perfil && typeof d.perfil === "object") ? d.perfil : {};
    const catCounts = d.catCounts || {};

    // classe: o nome bonito vem do save; o World não precisa da tabela de classes
    const CLASSES: Record<string, { nome: string; emoji: string }> = {
      guardiao: { nome: "Guardião", emoji: "🛡️" }, cavaleiro: { nome: "Cavaleiro", emoji: "⚔️" },
      mago: { nome: "Mago", emoji: "🧙" }, cacador: { nome: "Caçador", emoji: "🏹" },
      druida: { nome: "Druida", emoji: "🌿" }, bardo: { nome: "Bardo", emoji: "🎭" },
      oraculo: { nome: "Oráculo", emoji: "🔮" }, domador: { nome: "Domador", emoji: "🐉" },
    };
    const classe = perfil.classe && CLASSES[perfil.classe]
      ? { id: perfil.classe, ...CLASSES[perfil.classe] }
      : null;

    const porCategoria: Record<string, number> = {};
    missoes.forEach((m) => {
      const k = m.categoria_id || "outros";
      porCategoria[k] = (porCategoria[k] || 0) + 1;
    });

    const tama = d.tama || {};
    const ESTAGIOS = ["Ovo Digital", "Bebê", "Treino", "Amador"];

    return NextResponse.json({
      contrato: CONTRATO,
      geradoEm: new Date().toISOString(),

      personagem: {
        id: userId,
        nome: d.playerName || "Herói",
        nivel: level,
        xpTotal: d.xpTotal || 0,
        xpNoNivel: xpInLevel,
        xpParaProximo: xpForNext,
        classe,
        avatar: { forma: level >= 10 ? "suprema" : "normal" },
        cosmeticosEquipados: Object.values((d.cosmetics || {}).equipped || {}).filter(Boolean),
      },

      atributos: calcAtributos(d).map((a: any) => ({
        id: a.id, nome: a.nome, emoji: a.emoji, cor: a.cor,
        nivel: a.nivel, pct: a.pct, noMaximo: a.noMax,
      })),

      // as categorias do jogador — o World decide como representá-las.
      // Nenhuma categoria é obrigatória, e ids desconhecidos são normais.
      regioes: cats.filter((c) => c.ativa).map((c) => ({
        id: c.id, nome: c.nome, emoji: c.emoji, cor: c.cor, ordem: c.ordem,
        sistema: c.sistema || null,
        missoesAtivas: porCategoria[c.id] || 0,
        conclusoes: catCounts[c.id] || 0,
        desenvolvimento: desenvolvimento(catCounts[c.id] || 0),
      })),

      missoes: missoes.map((m) => ({
        id: m.id, nome: m.nome, regiaoId: m.categoria_id,
        xp: m.xp, dificuldade: m.dificuldade,
        etapas: Array.isArray(m.etapas) ? m.etapas.length : 0,
      })),

      pet: tama.type ? {
        tipo: tama.type,
        estagio: tama.stage || 0,
        estagioNome: ESTAGIOS[tama.stage || 0] || "Ovo Digital",
        vinculo: tama.bond || 0,
        nome: (d.pet || {}).name || "Monstrinho",
      } : null,

      progresso: {
        missoesConcluidas: d.tasksCompleted || 0,
        sequenciaAtual: d.currentStreak || 0,
        maiorSequencia: d.longestStreak || 0,
        metaSequencia: perfil.metaStreak || 7,
        diasAtivos: (d.daysActive || []).length,
        ouro: d.gold || 0,
        gemas: d.gems || 0,
        conquistas: (d.achievements || []).length,
        chefesDerrotados: (d.bossesDefeated || []).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ erro: "falha", detalhe: e?.message }, { status: 500 });
  }
}
