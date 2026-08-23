// @ts-nocheck
"use client";
import React, { useState } from "react";

/* ============================================================
   CRIAÇÃO DO HERÓI (Fase 5A)

   O fluxo que monta o mundo em torno da vida de quem chega.
   É SEMPRE pulável: quem não tiver paciência para formulário
   começa a jogar na hora, com um mundo genérico pronto, e pode
   configurar tudo depois.

   Este componente não conhece o save nem o banco: ele devolve um
   "plano" simples, e quem chamou decide o que fazer com ele.
   ============================================================ */

const C = {
  night: "#1b1430", night2: "#241a40", parch: "#f4e6c5", parch2: "#ead2a0",
  ink: "#3a2a18", inkSoft: "#6b5436", gold: "#e8b339", goldDeep: "#b3801c",
  xp: "#5bbd6a", xpDeep: "#3c9a4c", ember: "#ff7a3d",
};

export const CLASSES = [
  { id: "guardiao", nome: "Guardião", emoji: "🛡️", vibe: "protege o que importa" },
  { id: "cavaleiro", nome: "Cavaleiro", emoji: "⚔️", vibe: "encara de frente" },
  { id: "mago", nome: "Mago", emoji: "🧙", vibe: "resolve com engenho" },
  { id: "cacador", nome: "Caçador", emoji: "🏹", vibe: "vai atrás do alvo" },
  { id: "druida", nome: "Druida", emoji: "🌿", vibe: "cuida e cultiva" },
  { id: "bardo", nome: "Bardo", emoji: "🎭", vibe: "leva leveza aos dias" },
  { id: "oraculo", nome: "Oráculo", emoji: "🔮", vibe: "enxerga adiante" },
  { id: "domador", nome: "Domador", emoji: "🐉", vibe: "doma o próprio caos" },
];

/** Catálogo de áreas da vida. O usuário escolhe as que são dele. */
const AREAS = [
  { id: "casa", nome: "Casa", emoji: "🏠", cor: "#5aa9e6", sistema: null,
    missoes: ["Louça em dia", "Lixo para fora", "Roupas guardadas"] },
  { id: "pessoal", nome: "Pessoal", emoji: "🌱", cor: "#e8b339", sistema: null,
    missoes: ["Beber água", "Tomar um banho gostoso", "Arrumar a mochila"] },
  { id: "trabalho", nome: "Trabalho", emoji: "💼", cor: "#8a6bd1", sistema: null,
    missoes: ["Responder mensagens", "Fechar a tarefa mais chata", "Organizar o dia"] },
  { id: "estudos", nome: "Estudos", emoji: "📚", cor: "#4b8fd6", sistema: null,
    missoes: ["Ler 10 páginas", "Revisar anotações", "Uma aula assistida"] },
  { id: "pet", nome: "Pet", emoji: "🐾", cor: "#e879a6", sistema: "pet",
    missoes: ["Colocar comida", "Água fresca", "Brincar um pouco"] },
  { id: "corpo", nome: "Corpo", emoji: "🏃", cor: "#57a05a", sistema: null,
    missoes: ["Alongar 5 minutos", "Uma caminhada", "Dormir no horário"] },
  { id: "dinheiro", nome: "Dinheiro", emoji: "🪙", cor: "#c94f5e", sistema: null,
    missoes: ["Conferir o saldo", "Anotar os gastos", "Pagar a conta do dia"] },
  { id: "pessoas", nome: "Pessoas", emoji: "💛", cor: "#e8843a", sistema: null,
    missoes: ["Mandar mensagem para alguém", "Ligar para a família"] },
  { id: "saude", nome: "Saúde", emoji: "❤️", cor: "#34b3a0", sistema: "saude",
    missoes: [] },
];
const MAX_AREAS = 8;

const METAS = [
  { dias: 3, rotulo: "3 dias", vibe: "começar é o que importa" },
  { dias: 7, rotulo: "1 semana", vibe: "o clássico" },
  { dias: 15, rotulo: "15 dias", vibe: "para firmar o hábito" },
  { dias: 30, rotulo: "30 dias", vibe: "desafio de verdade" },
];

function Passo({ titulo, subtitulo, children }) {
  return (
    <div className="w-full">
      <h2 style={{ color: C.parch }} className="font-serif text-2xl font-black leading-tight">{titulo}</h2>
      {subtitulo && <p style={{ color: C.parch2 }} className="mt-1 text-sm">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function CriacaoDoHeroi({ onConcluir, onPular }) {
  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState("");
  const [classe, setClasse] = useState(null);
  const [areas, setAreas] = useState(["casa", "pessoal"]);
  const [missoes, setMissoes] = useState({});   // { "casa|Louça em dia": true }
  const [meta, setMeta] = useState(7);
  const [glicose, setGlicose] = useState(false);

  const areasEscolhidas = AREAS.filter((a) => areas.includes(a.id));
  const toggleArea = (id) => setAreas((as) => {
    if (as.includes(id)) return as.filter((x) => x !== id);
    if (as.length >= MAX_AREAS) return as;
    return [...as, id];
  });
  const toggleMissao = (areaId, nomeMissao) =>
    setMissoes((m) => ({ ...m, [`${areaId}|${nomeMissao}`]: !m[`${areaId}|${nomeMissao}`] }));

  const concluir = () => {
    const cats = areasEscolhidas.map((a, i) => ({
      idBase: a.id, nome: a.nome, emoji: a.emoji, cor: a.cor, sistema: a.sistema, ordem: i,
    }));
    const tarefas = [];
    areasEscolhidas.forEach((a) => {
      a.missoes.forEach((nm) => {
        if (missoes[`${a.id}|${nm}`]) tarefas.push({ nome: nm, area: a.id });
      });
    });
    onConcluir({
      nomeHeroi: nome.trim() || "Herói",
      classe,
      categorias: cats,
      missoes: tarefas,
      metaStreak: meta,
      mostrarGlicose: glicose,
    });
  };

  const passos = [
    // 0 — boas-vindas
    <Passo key="p0" titulo="Bem-vindo, herói ⚔️"
      subtitulo="Vamos montar o seu mundo em uns 2 minutos. O jogo se adapta a você — não o contrário.">
      <div style={{ background: "rgba(244,230,197,.08)", border: `2px solid ${C.goldDeep}` }}
        className="rounded-2xl p-4 text-sm" >
        <p style={{ color: C.parch }}>Aqui a sua rotina vira aventura:</p>
        <ul style={{ color: C.parch2 }} className="mt-2 list-disc space-y-1 pl-5">
          <li>Você escolhe as <b>áreas da sua vida</b> — nada de categorias prontas</li>
          <li>Missões grandes podem virar <b>passos pequenos</b></li>
          <li>Pular uma missão <b>nunca</b> tira pontos</li>
        </ul>
      </div>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como quer ser chamado?"
        maxLength={24} style={{ borderColor: C.goldDeep, color: C.ink }}
        className="mt-4 w-full rounded-xl border-2 bg-white/80 px-4 py-3 text-center text-lg font-bold outline-none" />
    </Passo>,

    // 1 — classe
    <Passo key="p1" titulo="Que tipo de herói você é?"
      subtitulo="Isto é só identidade — nenhuma classe é melhor que a outra, e dá para trocar quando quiser.">
      <div className="grid grid-cols-2 gap-2">
        {CLASSES.map((c) => (
          <button key={c.id} onClick={() => setClasse(c.id)}
            style={{ background: classe === c.id ? C.gold : "rgba(244,230,197,.08)",
                     border: `2px solid ${classe === c.id ? C.gold : "rgba(244,230,197,.25)"}`,
                     color: classe === c.id ? C.ink : C.parch }}
            className="rounded-2xl px-2 py-3 text-center active:scale-95 transition">
            <div className="text-2xl">{c.emoji}</div>
            <div className="text-sm font-black">{c.nome}</div>
            <div className="text-[10px] opacity-80">{c.vibe}</div>
          </button>
        ))}
      </div>
    </Passo>,

    // 2 — áreas da vida
    <Passo key="p2" titulo="Quais são as áreas da sua vida?"
      subtitulo={`Escolha as que fazem sentido hoje. Dá para criar, renomear e mudar tudo depois. (${areas.length}/${MAX_AREAS})`}>
      <div className="grid grid-cols-2 gap-2">
        {AREAS.map((a) => {
          const on = areas.includes(a.id);
          const cheio = !on && areas.length >= MAX_AREAS;
          return (
            <button key={a.id} onClick={() => toggleArea(a.id)} disabled={cheio}
              style={{ background: on ? a.cor : "rgba(244,230,197,.08)",
                       border: `2px solid ${on ? a.cor : "rgba(244,230,197,.25)"}`,
                       color: on ? "#fff" : C.parch, opacity: cheio ? 0.4 : 1 }}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left active:scale-95 transition">
              <span className="text-lg">{a.emoji}</span>
              <span className="text-sm font-bold">{a.nome}</span>
              {a.sistema && <span className="ml-auto text-[9px] opacity-80">especial</span>}
            </button>
          );
        })}
      </div>
      <p style={{ color: C.parch2 }} className="mt-3 text-[11px]">
        As áreas marcadas como <b>especial</b> ganham telas próprias no jogo: a do Pet alimenta o
        seu monstrinho, e a de Saúde tem remédios, água e refeições.
      </p>
    </Passo>,

    // 3 — missões iniciais
    <Passo key="p3" titulo="Por onde começar?"
      subtitulo="Escolha algumas missões para o primeiro dia. Pode deixar em branco — dá para criar as suas a qualquer hora.">
      <div className="space-y-3" style={{ maxHeight: "48vh", overflowY: "auto" }}>
        {areasEscolhidas.filter((a) => a.missoes.length).map((a) => (
          <div key={a.id}>
            <div style={{ color: C.parch }} className="mb-1 text-sm font-bold">{a.emoji} {a.nome}</div>
            <div className="space-y-1.5">
              {a.missoes.map((nm) => {
                const on = !!missoes[`${a.id}|${nm}`];
                return (
                  <button key={nm} onClick={() => toggleMissao(a.id, nm)}
                    style={{ background: on ? "rgba(91,189,106,.18)" : "rgba(244,230,197,.06)",
                             border: `2px solid ${on ? C.xpDeep : "rgba(244,230,197,.2)"}` }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left active:scale-[.98] transition">
                    <span style={{ background: on ? C.xp : "transparent", border: `2px solid ${on ? C.xpDeep : C.parch2}` }}
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-xs text-white">
                      {on ? "✓" : ""}
                    </span>
                    <span style={{ color: C.parch }} className="text-sm font-bold">{nm}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Passo>,

    // 4 — meta de sequência
    <Passo key="p4" titulo="Qual a sua meta de sequência?"
      subtitulo="Quantos dias seguidos você quer mirar. É só uma meta sua — falhar não tira nada.">
      <div className="space-y-2">
        {METAS.map((m) => (
          <button key={m.dias} onClick={() => setMeta(m.dias)}
            style={{ background: meta === m.dias ? C.gold : "rgba(244,230,197,.08)",
                     border: `2px solid ${meta === m.dias ? C.gold : "rgba(244,230,197,.25)"}`,
                     color: meta === m.dias ? C.ink : C.parch }}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-95 transition">
            <span className="text-xl">🔥</span>
            <span className="flex-1">
              <span className="block font-black">{m.rotulo}</span>
              <span className="block text-[11px] opacity-80">{m.vibe}</span>
            </span>
          </button>
        ))}
      </div>
    </Passo>,

    // 5 — saúde
    <Passo key="p5" titulo="Você acompanha a glicemia?"
      subtitulo="Se sim, o app ganha um painel para anotar as medições e lembrar dos horários.">
      <div className="space-y-2">
        <button onClick={() => setGlicose(true)}
          style={{ background: glicose ? "#34b3a0" : "rgba(244,230,197,.08)",
                   border: `2px solid ${glicose ? "#34b3a0" : "rgba(244,230,197,.25)"}`,
                   color: glicose ? "#fff" : C.parch }}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-95 transition">
          <span className="text-xl">🩸</span>
          <span className="flex-1 font-bold">Sim, quero o painel de glicose</span>
        </button>
        <button onClick={() => setGlicose(false)}
          style={{ background: !glicose ? C.gold : "rgba(244,230,197,.08)",
                   border: `2px solid ${!glicose ? C.gold : "rgba(244,230,197,.25)"}`,
                   color: !glicose ? C.ink : C.parch }}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-95 transition">
          <span className="text-xl">🚫</span>
          <span className="flex-1 font-bold">Não preciso disso</span>
        </button>
      </div>
      <p style={{ color: C.parch2 }} className="mt-3 text-[11px]">
        Você pode ligar ou desligar depois, nos ajustes. Remédios, água e refeições continuam
        disponíveis para todo mundo.
      </p>
    </Passo>,

    // 6 — pronto
    <Passo key="p6" titulo="Seu mundo está pronto 🎉"
      subtitulo="Confira e comece a aventura. Nada aqui é definitivo — tudo pode mudar depois.">
      <div style={{ background: "rgba(244,230,197,.08)", border: `2px solid ${C.goldDeep}` }}
        className="space-y-2 rounded-2xl p-4 text-sm">
        <div style={{ color: C.parch }}>
          <b>{nome.trim() || "Herói"}</b>
          {classe && <> · {CLASSES.find((c) => c.id === classe)?.emoji} {CLASSES.find((c) => c.id === classe)?.nome}</>}
        </div>
        <div style={{ color: C.parch2 }}>
          {areasEscolhidas.length} {areasEscolhidas.length === 1 ? "área" : "áreas"}:{" "}
          {areasEscolhidas.map((a) => `${a.emoji} ${a.nome}`).join(" · ")}
        </div>
        <div style={{ color: C.parch2 }}>
          {Object.values(missoes).filter(Boolean).length} missões para começar
        </div>
        <div style={{ color: C.parch2 }}>🔥 meta de {meta} dias seguidos</div>
        {glicose && <div style={{ color: C.parch2 }}>🩸 painel de glicose ligado</div>}
      </div>
    </Passo>,
  ];

  const ultimo = passo === passos.length - 1;
  const podeAvancar = passo !== 2 || areas.length > 0;

  return (
    <div style={{ background: `radial-gradient(circle at 50% 0%, ${C.night2}, ${C.night})`, minHeight: "100vh" }}
      className="flex flex-col items-center px-5 py-6 font-sans">
      <div className="w-full max-w-md flex-1">
        {/* progresso */}
        <div className="mb-5 flex items-center gap-1.5">
          {passos.map((_, i) => (
            <div key={i} style={{ background: i <= passo ? C.gold : "rgba(244,230,197,.2)" }}
              className="h-1.5 flex-1 rounded-full transition-all" />
          ))}
        </div>

        {passos[passo]}
      </div>

      <div className="w-full max-w-md pt-6">
        <div className="flex gap-2">
          {passo > 0 && (
            <button onClick={() => setPasso((p) => p - 1)} style={{ color: C.parch2 }}
              className="rounded-2xl px-5 py-3 text-sm font-bold">← Voltar</button>
          )}
          <button onClick={() => (ultimo ? concluir() : setPasso((p) => p + 1))} disabled={!podeAvancar}
            style={{ background: C.gold, color: C.ink, opacity: podeAvancar ? 1 : 0.5 }}
            className="flex-1 rounded-2xl py-3 font-serif text-lg font-black active:scale-95 transition">
            {ultimo ? "⚔️ Começar a aventura" : "Continuar"}
          </button>
        </div>
        <button onClick={onPular} style={{ color: C.parch2 }}
          className="mt-3 w-full py-2 text-xs font-bold opacity-80">
          Pular e começar com um mundo pronto
        </button>
      </div>
    </div>
  );
}
