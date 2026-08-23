// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/* ============================================================
   QUESTAH WORLD — World 0

   O portal e a prova de que o progresso do celular existe deste
   lado. Sem 3D nenhum de propósito: o World 0 valida a fundação
   (pareamento seguro + contrato de dados) antes de qualquer
   camada gráfica entrar em cima.
   ============================================================ */

const C = {
  night: "#1b1430", night2: "#241a40", parch: "#f4e6c5", parch2: "#ead2a0",
  ink: "#3a2a18", inkSoft: "#6b5436", gold: "#e8b339", goldDeep: "#b3801c",
  xp: "#5bbd6a", xpDeep: "#3c9a4c", ember: "#ff7a3d",
};

const CHAVE_SESSAO = "questah_world_token";

export default function WorldPage() {
  const [fase, setFase] = useState("abrindo");   // abrindo | portal | dentro | erro
  const [portal, setPortal] = useState(null);    // { codigo, numero, segredo, expiraEm }
  const [qr, setQr] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [erro, setErro] = useState("");
  const [restante, setRestante] = useState(0);
  const segredoRef = useRef(null);
  const pollRef = useRef(null);

  /* ---------- ao entrar: tenta a sessão guardada, senão abre um portal ---------- */
  useEffect(() => {
    const guardado = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(CHAVE_SESSAO) : null;
    if (guardado) { buscarSnapshot(guardado); return; }
    abrirPortal();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line
  }, []);

  const abrirPortal = async () => {
    setFase("abrindo"); setErro("");
    try {
      const r = await fetch("/api/world/pareamento", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detalhe || "não consegui abrir o portal");
      segredoRef.current = j.segredo;
      setPortal(j);
      const url = `${window.location.origin}/portal/${j.codigo}`;
      setQr(await QRCode.toDataURL(url, { width: 320, margin: 1,
        color: { dark: "#1b1430", light: "#f4e6c5" } }));
      setFase("portal");
      iniciarEspera(j.codigo, j.expiraEm);
    } catch (e) {
      setErro(String(e?.message || e)); setFase("erro");
    }
  };

  const iniciarEspera = (codigo, expiraEm) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const falta = Math.max(0, Math.round((new Date(expiraEm).getTime() - Date.now()) / 1000));
      setRestante(falta);
      try {
        const r = await fetch(`/api/world/pareamento/${codigo}`, {
          headers: { "x-world-segredo": segredoRef.current || "" },
        });
        const j = await r.json();
        if (j.status === "confirmado" && j.token) {
          clearInterval(pollRef.current);
          try { sessionStorage.setItem(CHAVE_SESSAO, j.token); } catch (e) {}
          buscarSnapshot(j.token);
        } else if (["expirado", "cancelado", "revogado", "inexistente"].includes(j.status)) {
          clearInterval(pollRef.current);
          setErro(j.status === "cancelado" ? "O portal foi recusado no celular."
            : j.status === "expirado" ? "O portal expirou."
            : "Este portal não vale mais.");
          setFase("erro");
        }
      } catch (e) { /* rede instável: tenta de novo no próximo tique */ }
    }, 2000);
  };

  const buscarSnapshot = async (token) => {
    setFase("abrindo");
    try {
      const r = await fetch("/api/world/snapshot", { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) {
        try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) {}
        abrirPortal(); return;
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detalhe || "não consegui carregar o seu mundo");
      setSnapshot(j); setFase("dentro");
    } catch (e) { setErro(String(e?.message || e)); setFase("erro"); }
  };

  const sair = () => {
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) {}
    setSnapshot(null); abrirPortal();
  };

  /* ============================================================ */
  return (
    <main style={{ background: `radial-gradient(circle at 50% 0%, ${C.night2}, ${C.night})`, minHeight: "100vh" }}
      className="flex flex-col items-center px-6 py-10 font-sans">

      <h1 style={{ color: C.gold }} className="font-serif text-4xl font-black tracking-tight">
        QUES<span style={{ color: C.parch }}>TAH</span> WORLD
      </h1>

      {fase === "abrindo" && (
        <p style={{ color: C.parch2 }} className="mt-10 animate-pulse font-serif text-xl">✨ abrindo o portal…</p>
      )}

      {fase === "erro" && (
        <div className="mt-10 text-center">
          <p style={{ color: C.ember }} className="font-bold">{erro}</p>
          <button onClick={abrirPortal} style={{ background: C.gold, color: C.ink }}
            className="mt-5 rounded-2xl px-6 py-3 font-serif font-black">Abrir outro portal</button>
        </div>
      )}

      {/* ---------- PORTAL ---------- */}
      {fase === "portal" && portal && (
        <>
          <p style={{ color: C.parch }} className="mt-2 text-lg">Entre no seu mundo.</p>
          <p style={{ color: C.parch2 }} className="mt-1 text-sm">Aponte o celular para o código.</p>

          <div style={{ background: C.parch, border: `4px solid ${C.goldDeep}` }}
            className="mt-7 rounded-3xl p-4">
            {qr ? <img src={qr} alt="Código do portal" width={280} height={280} />
                : <div style={{ width: 280, height: 280 }} />}
          </div>

          <div className="mt-6 text-center">
            <div style={{ color: C.parch2 }} className="text-xs font-bold uppercase tracking-widest">
              Código de segurança
            </div>
            <div style={{ color: C.gold, letterSpacing: "0.35em" }}
              className="font-serif text-5xl font-black">{portal.numero}</div>
            <div style={{ color: C.parch2 }} className="mt-2 text-xs">
              Confirme este número no celular antes de entrar.
            </div>
          </div>

          <div style={{ color: C.parch2 }} className="mt-6 text-sm">
            {restante > 0 ? <>expira em {restante}s</> : <>expirando…</>}
          </div>
          <button onClick={abrirPortal} style={{ color: C.parch2 }} className="mt-2 text-xs font-bold underline">
            gerar outro
          </button>
        </>
      )}

      {/* ---------- DENTRO DO MUNDO (ainda sem 3D) ---------- */}
      {fase === "dentro" && snapshot && (
        <div className="mt-6 w-full max-w-3xl">
          <p style={{ color: C.xp }} className="text-center font-serif text-xl font-black">✨ Portal aberto</p>

          <Bloco titulo="Personagem">
            <Linha rotulo="Nome" valor={snapshot.personagem.nome} />
            <Linha rotulo="Classe" valor={snapshot.personagem.classe
              ? `${snapshot.personagem.classe.emoji} ${snapshot.personagem.classe.nome}` : "—"} />
            <Linha rotulo="Nível" valor={snapshot.personagem.nivel} />
            <Linha rotulo="XP" valor={`${snapshot.personagem.xpNoNivel} / ${snapshot.personagem.xpParaProximo} (total ${snapshot.personagem.xpTotal})`} />
            <Linha rotulo="Forma" valor={snapshot.personagem.avatar.forma} />
          </Bloco>

          <Bloco titulo="Atributos">
            {snapshot.atributos.map((a) => (
              <div key={a.id} className="mb-2">
                <div className="flex justify-between text-sm" style={{ color: C.parch }}>
                  <span>{a.emoji} {a.nome}</span>
                  <span className="font-bold">{a.noMaximo ? "MÁX" : a.nivel}</span>
                </div>
                <div style={{ background: "rgba(244,230,197,.15)" }} className="mt-1 h-2 w-full overflow-hidden rounded-full">
                  <div style={{ width: `${a.pct}%`, background: a.cor }} className="h-full rounded-full" />
                </div>
              </div>
            ))}
          </Bloco>

          <Bloco titulo={`Regiões (${snapshot.regioes.length})`}>
            <p style={{ color: C.parch2 }} className="mb-3 text-xs">
              Cada área da sua vida vira uma região do mundo. No World 3 elas ganham forma.
            </p>
            {snapshot.regioes.map((r) => (
              <div key={r.id} className="mb-2 flex items-center gap-3">
                <span className="text-lg">{r.emoji}</span>
                <span style={{ color: C.parch }} className="w-32 font-bold">{r.nome}</span>
                <div style={{ background: "rgba(244,230,197,.15)" }} className="h-2 flex-1 overflow-hidden rounded-full">
                  <div style={{ width: `${r.desenvolvimento}%`, background: r.cor }} className="h-full rounded-full" />
                </div>
                <span style={{ color: C.parch2 }} className="w-40 text-right text-xs">
                  {r.conclusoes} conclusões · {r.missoesAtivas} ativas
                </span>
              </div>
            ))}
          </Bloco>

          {snapshot.pet && (
            <Bloco titulo="Companheiro">
              <Linha rotulo="Nome" valor={snapshot.pet.nome} />
              <Linha rotulo="Tipo" valor={snapshot.pet.tipo} />
              <Linha rotulo="Estágio" valor={`${snapshot.pet.estagioNome} (${snapshot.pet.estagio})`} />
              <Linha rotulo="Vínculo" valor={snapshot.pet.vinculo} />
            </Bloco>
          )}

          <Bloco titulo="Progresso">
            <Linha rotulo="Missões concluídas" valor={snapshot.progresso.missoesConcluidas} />
            <Linha rotulo="Sequência" valor={`${snapshot.progresso.sequenciaAtual} (meta ${snapshot.progresso.metaSequencia} · recorde ${snapshot.progresso.maiorSequencia})`} />
            <Linha rotulo="Dias ativos" valor={snapshot.progresso.diasAtivos} />
            <Linha rotulo="Ouro / Gemas" valor={`${snapshot.progresso.ouro} / ${snapshot.progresso.gemas}`} />
            <Linha rotulo="Conquistas" valor={snapshot.progresso.conquistas} />
          </Bloco>

          <p style={{ color: C.parch2 }} className="mt-6 text-center text-xs">
            World 0 — a fundação. O mundo 3D entra a partir do World 1.<br />
            Contrato {snapshot.contrato} · gerado em {new Date(snapshot.geradoEm).toLocaleString("pt-BR")}
          </p>

          <div className="mt-4 flex justify-center gap-3">
            <button onClick={() => buscarSnapshot(sessionStorage.getItem(CHAVE_SESSAO))}
              style={{ background: C.gold, color: C.ink }}
              className="rounded-xl px-5 py-2 text-sm font-bold">Atualizar</button>
            <button onClick={sair} style={{ color: C.parch2 }} className="rounded-xl px-5 py-2 text-sm font-bold">
              Sair do mundo
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Bloco({ titulo, children }) {
  return (
    <section style={{ background: "rgba(244,230,197,.06)", border: `2px solid ${C.goldDeep}` }}
      className="mt-5 rounded-2xl p-5">
      <h2 style={{ color: C.gold }} className="mb-3 font-serif text-lg font-black">{titulo}</h2>
      {children}
    </section>
  );
}
function Linha({ rotulo, valor }) {
  return (
    <div className="flex justify-between border-b py-1 text-sm" style={{ borderColor: "rgba(244,230,197,.12)" }}>
      <span style={{ color: C.parch2 }}>{rotulo}</span>
      <span style={{ color: C.parch }} className="font-bold">{String(valor)}</span>
    </div>
  );
}
