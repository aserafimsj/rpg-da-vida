// @ts-nocheck
/**
 * A CAMADA DE INTERPRETAÇÃO do QuesTAH World.
 *
 * Regra da arquitetura (§7.1): o dado do jogo NÃO sabe que existe um mundo 3D.
 * A classe continua sendo `{ id, nome, emoji }` e a categoria continua sendo
 * `{ id, nome, emoji, cor, ... }` — nenhum campo de 3D entra lá.
 *
 * É aqui, e só aqui, que "guardiao" vira uma cor e uma silhueta. Se um dia o
 * mundo mudar de estilo, muda este arquivo — o jogo não fica sabendo.
 *
 * Ids desconhecidos NUNCA quebram: caem num fallback digno, igual ao `catView`
 * da Fase 1.
 */

/** Paleta do mundo — herdada do app (pergaminho, noite, ouro). */
export const CORES = {
  ceuAlto: "#2a3f6b",
  chao: "#4e7a45",
  chaoEscuro: "#3d6136",
  pele: "#e8c9a0",
  ouro: "#e8b339",
  ouroFundo: "#b3801c",
};

/**
 * Cada classe tem uma cor no mundo. Isto é invenção do World — o save guarda
 * só o id da classe, como sempre guardou.
 */
const VISUAL_CLASSE = {
  guardiao:  { cor: "#4b7fb5", detalhe: "#2f5580" },
  cavaleiro: { cor: "#b34a4a", detalhe: "#7d2f2f" },
  mago:      { cor: "#7a5bc4", detalhe: "#4f3a85" },
  cacador:   { cor: "#3f7f5a", detalhe: "#2a5a3e" },
  druida:    { cor: "#6f9a3f", detalhe: "#4d6d2b" },
  bardo:     { cor: "#d18a3a", detalhe: "#96602a" },
  oraculo:   { cor: "#8f5bb5", detalhe: "#5f3a7a" },
  domador:   { cor: "#c4603a", detalhe: "#8a4128" },
};

/** Fallback: quem ainda não escolheu classe é dourado, a cor do próprio QuesTAH. */
const VISUAL_PADRAO = { cor: CORES.ouro, detalhe: CORES.ouroFundo };

export function visualDaClasse(classeId) {
  return VISUAL_CLASSE[classeId] || VISUAL_PADRAO;
}

/* ---------- utilidades de cor ---------- */

function paraRgb(hex) {
  const h = String(hex || "").replace("#", "");
  const c = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(c, 16);
  return Number.isFinite(n) && c.length === 6
    ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    : { r: 200, g: 200, b: 200 };
}

/**
 * Mistura duas cores. `t = 0` devolve a primeira, `t = 1` a segunda.
 *
 * Serve para as paredes das construções: elas nascem da cor que o jogador
 * escolheu para a categoria, clareada até virar parede. Assim a região é
 * reconhecidamente dele sem que tudo fique de uma cor chapada só.
 */
export function misturar(hexA, hexB, t) {
  const a = paraRgb(hexA), b = paraRgb(hexB);
  const k = Math.max(0, Math.min(1, t));
  const v = (x, y) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${v(a.r, b.r)}${v(a.g, b.g)}${v(a.b, b.b)}`;
}
