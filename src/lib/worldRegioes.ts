// @ts-nocheck
/**
 * ARQUÉTIPOS DE REGIÃO — a tradução de "categoria" para "lugar".
 *
 * Continuação da camada de interpretação (§7 da arquitetura). A regra que não
 * se negocia: **a categoria não sabe que existe um mundo 3D**. Ela continua
 * sendo `{ id, nome, emoji, cor, ordem, ativa, sistema }` desde a Fase 1.
 *
 * O mundo não conhece "Trabalho" nem "Casa" — conhece um punhado de arquétipos.
 * É isso que permite a alguém criar "Apicultura", "Marcenaria" ou "Cuidar da
 * avó" e ganhar um lugar sem ninguém ter previsto: cai em `generico`, que é uma
 * clareira que ganha forma com o uso. Mesma lógica do `catView` da Fase 1 —
 * id desconhecido nunca quebra, cai num fallback digno.
 */

/* ------------------------------------------------------------------ *
 *  Os arquétipos
 *
 *  `construcao` e `adorno` são as formas que o renderizador sabe montar.
 *  Um arquétipo novo é uma linha nova aqui — não é código novo de desenho.
 * ------------------------------------------------------------------ */
export const ARQUETIPOS = {
  residencial:  { rotulo: "vila",        construcao: "casa",      adorno: "arvore",  telhado: "#a8503c", raioColisao: 1.0 },
  profissional: { rotulo: "distrito",    construcao: "torre",     adorno: "poste",   telhado: "#5b6b86", raioColisao: 0.75 },
  saber:        { rotulo: "biblioteca",  construcao: "torre",     adorno: "poste",   telhado: "#6a5a9a", raioColisao: 0.75 },
  treino:       { rotulo: "arena",       construcao: "galpao",    adorno: "pedra",   telhado: "#9a7b3f", raioColisao: 1.5 },
  criativo:     { rotulo: "ateliê",      construcao: "tenda",     adorno: "flor",    telhado: "#c2683f", raioColisao: 1.0 },
  natureza:     { rotulo: "bosque",      construcao: "arvoreG",   adorno: "flor",    telhado: "#3f7a3a", raioColisao: 0.6 },
  social:       { rotulo: "praça",       construcao: "tenda",     adorno: "poste",   telhado: "#b8823c", raioColisao: 1.0 },
  cuidado:      { rotulo: "santuário",   construcao: "santuario", adorno: "flor",    telhado: "#4f9b8e", raioColisao: 1.2 },
  companhia:    { rotulo: "recanto",     construcao: "casa",      adorno: "flor",    telhado: "#c46b8a", raioColisao: 1.0 },
  generico:     { rotulo: "clareira",    construcao: "casa",      adorno: "pedra",   telhado: "#8a7b5c", raioColisao: 1.0 },
};

/* Emoji é o sinal mais forte: quem escolheu 📚 disse o que aquilo é. */
const POR_EMOJI = {
  residencial:  ["🏠","🏡","🛋️","🧹","🛏️","🚪","🪟"],
  profissional: ["💼","💻","📊","🏢","📈","🗂️","✉️"],
  saber:        ["📚","📖","🎓","✏️","🔬","🧠","🗺️"],
  treino:       ["🏋️","🏃","⚽","🚴","🥊","🤸","🏊"],
  criativo:     ["🎵","🎨","✍️","🎸","🎬","📷","🎹","🎤"],
  natureza:     ["🌿","🌱","🌳","🪴","🌻","🍃","🐝"],
  social:       ["👥","🤝","💬","🎉","☕","🫂"],
  cuidado:      ["❤️","🧘","💊","🩺","😴","🛁","🧴"],
  companhia:    ["🐾","🐶","🐱","🐉"],
};

/* Palavras do nome, sem acento e em minúsculas. Ordem importa: a primeira
   lista que casar vence, então o que é mais específico vem antes. */
const POR_NOME = [
  ["companhia",    ["pet","bicho","cachorro","gato","monstrinho"]],
  ["cuidado",      ["saude","terapia","descanso","remedio","sono","dormir","medico","consulta","dentista","autocuidado"]],
  ["treino",       ["academia","corrida","treino","corpo","exercicio","esporte","musculacao","alongamento","caminhada"]],
  ["saber",        ["estudo","estudos","leitura","ler","idioma","ingles","curso","faculdade","escola","prova","aprender"]],
  ["criativo",     ["musica","arte","escrita","escrever","desenho","projeto","criar","foto","video","tocar"]],
  ["natureza",     ["planta","plantas","horta","jardim","trilha","natureza","quintal","flores"]],
  ["profissional", ["trabalho","negocio","carreira","empresa","escritorio","cliente","reuniao","freela","emprego"]],
  ["social",       ["amigo","amigos","pessoas","social","familia","namoro","filhos","encontro"]],
  ["residencial",  ["casa","lar","moradia","limpeza","faxina","arrumar","cozinha","mercado","compras","contas"]],
];

/* ̀-ͯ é o bloco dos acentos soltos que o NFD separa da letra.
   Escrito assim, com o código, porque colar os acentos crus aqui deixa o
   arquivo com caracteres invisíveis que um editor come sem avisar. */
const semAcento = (s) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * O palpite. Três camadas, na ordem da §7.3.
 *
 * `escolhaDoUsuario` ainda não tem onde ser guardada (isso é World 3, com a
 * tabela `world_regioes`), mas o parâmetro já existe para que a ordem de
 * precedência nasça certa e ninguém precise reescrever isto depois.
 */
export function arquetipoDe(regiao, escolhaDoUsuario = null) {
  if (escolhaDoUsuario && ARQUETIPOS[escolhaDoUsuario]) return escolhaDoUsuario;

  // 1. as categorias de sistema são explícitas — não se adivinha o que já se sabe
  if (regiao?.sistema === "pet") return "companhia";
  if (regiao?.sistema === "saude") return "cuidado";

  // 2. emoji
  const emoji = regiao?.emoji || "";
  if (emoji) {
    for (const [arq, lista] of Object.entries(POR_EMOJI)) {
      if (lista.some((e) => emoji.includes(e))) return arq;
    }
  }

  // 3. palavras do nome
  const nome = semAcento(regiao?.nome);
  if (nome) {
    for (const [arq, palavras] of POR_NOME) {
      if (palavras.some((p) => nome.includes(p))) return arq;
    }
  }

  // 4. o fallback digno
  return "generico";
}

/**
 * Quantas construções a região tem, a partir do desenvolvimento (0–100).
 *
 * Sempre pelo menos UMA. Uma área da vida que você acabou de criar não é um
 * terreno baldio — é um lugar recém-fundado. "O mundo nunca regride" começa
 * aqui: nada some, nada fica vazio.
 */
export function tamanhoDaRegiao(desenvolvimento) {
  const d = Math.max(0, Math.min(100, desenvolvimento || 0));
  return {
    construcoes: 1 + Math.round((d / 100) * 6),   // 1 a 7
    adornos: 3 + Math.round((d / 100) * 9),       // 3 a 12
    raio: 3.2 + (d / 100) * 3.0,                  // o lugar se espalha conforme cresce
    altura: 0.85 + (d / 100) * 0.55,              // e cresce um pouco para cima
  };
}

/** Sorteio com semente fixa — o lugar precisa ser o MESMO a cada visita. */
export function sorteioDe(semente) {
  let s = Math.abs(Math.floor(semente)) % 4294967296 || 7;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Semente estável a partir do id da categoria: o mesmo id, o mesmo lugar. */
export function sementeDoId(id) {
  let h = 2166136261;
  for (let i = 0; i < String(id).length; i++) {
    h ^= String(id).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
