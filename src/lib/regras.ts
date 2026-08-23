// @ts-nocheck
/**
 * Regras de derivação do QuesTAH — funções puras.
 *
 * Vivem aqui porque são lidas em DOIS lugares: o app (no navegador) e o
 * snapshot do QuesTAH World (no servidor). Duplicar a fórmula seria garantir
 * que um dia os dois mostrem números diferentes.
 *
 * Só entra aqui o que é derivação pura: nada de estado, rede ou interface.
 */

/* ---------- Curva de XP ---------- */
export const xpToNext = (level) =>
  Math.floor(100 + (level - 1) * 60 + Math.pow(level - 1, 2) * 10);

export function levelFromXp(xpTotal) {
  let level = 1, rem = xpTotal || 0;
  while (rem >= xpToNext(level)) { rem -= xpToNext(level); level++; }
  return { level, xpInLevel: rem, xpForNext: xpToNext(level) };
}

/* ---------- Atributos do herói (Fase 4B) ----------
   Crescem do COMPORTAMENTO, não das categorias. Veja DECISOES-DE-PRODUTO.md. */
export const ATRIBUTOS = [
  {
    id: "foco", nome: "Foco", emoji: "🎯", cor: "#4b8fd6",
    desc: "Terminar o que se começa",
    pontos: (d) => (d.etapasConcluidas || 0) * 3 + (d.focoConclusoes || 0) * 6,
  },
  {
    id: "disciplina", nome: "Disciplina", emoji: "🛡️", cor: "#8a6bd1",
    desc: "Sustentar o que é difícil",
    pontos: (d) => {
      const p = d.porDificuldade || {};
      return (p.epica || 0) * 8 + (p.normal || 0) * 2 + (d.medDaysTotal || 0) * 4;
    },
  },
  {
    id: "energia", nome: "Energia", emoji: "⚡", cor: "#e8843a",
    desc: "Colocar o corpo em movimento",
    pontos: (d) => {
      const p = d.porDificuldade || {};
      return (d.tasksCompleted || 0) * 2 + (p.rapida || 0) * 3;
    },
  },
  {
    id: "constancia", nome: "Constância", emoji: "🔥", cor: "#c94f5e",
    desc: "Voltar, dia após dia",
    pontos: (d) => ((d.daysActive || []).length) * 6 + (d.longestStreak || 0) * 10,
  },
];
export const ATRIBUTO_NIVEL_MAX = 10;
export const ATRIBUTO_BASE = 25; // pontos do nível 1; a curva é quadrática

/** Nível 0–10 a partir dos pontos, com o progresso até o próximo. */
export function nivelAtributo(pontos) {
  const p = Math.max(0, pontos || 0);
  const nivel = Math.min(ATRIBUTO_NIVEL_MAX, Math.floor(Math.sqrt(p / ATRIBUTO_BASE)));
  const pontosDoNivel = ATRIBUTO_BASE * nivel * nivel;
  const pontosDoProximo = ATRIBUTO_BASE * (nivel + 1) * (nivel + 1);
  const noMax = nivel >= ATRIBUTO_NIVEL_MAX;
  const pct = noMax ? 100 : Math.round(((p - pontosDoNivel) / (pontosDoProximo - pontosDoNivel)) * 100);
  return { nivel, pontos: p, pct: Math.max(0, Math.min(100, pct)), faltam: noMax ? 0 : pontosDoProximo - p, noMax };
}

/** A ficha completa, sempre derivada do save — nunca guardada, nunca desatualiza. */
export function calcAtributos(data) {
  return ATRIBUTOS.map((a) => ({ ...a, ...nivelAtributo(a.pontos(data || {})) }));
}
