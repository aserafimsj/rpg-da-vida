// @ts-nocheck
"use client";
import React, { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

/* ============================================================
   PORTAL — a tela do celular

   É aqui que a pessoa decide se aquele computador entra ou não
   no mundo dela. Nenhum pareamento acontece sem passar por esta
   confirmação explícita.
   ============================================================ */

const C = {
  night: "#1b1430", night2: "#241a40", parch: "#f4e6c5", parch2: "#ead2a0",
  ink: "#3a2a18", inkSoft: "#6b5436", gold: "#e8b339", goldDeep: "#b3801c",
  xp: "#5bbd6a", xpDeep: "#3c9a4c", ember: "#ff7a3d",
};

export default function PortalPage({ params }) {
  const codigo = String(params?.codigo || "").toUpperCase();
  const [estado, setEstado] = useState("carregando"); // carregando | pedindoLogin | aguardando | ok | recusado | erro
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const tokenAtual = async () => {
    const { data } = await getSupabase().auth.getSession();
    return data?.session?.access_token || null;
  };

  useEffect(() => {
    (async () => {
      const jwt = await tokenAtual();
      if (!jwt) { setEstado("pedindoLogin"); return; }
      try {
        const r = await fetch(`/api/world/solicitacao/${codigo}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const j = await r.json();
        if (r.status === 401) { setEstado("pedindoLogin"); return; }
        if (j.status === "aguardando") { setInfo(j); setEstado("aguardando"); return; }
        setMsg(
          j.status === "expirado" ? "Este portal expirou. Gere um novo no computador."
          : j.status === "cancelado" ? "Este portal foi cancelado."
          : j.status === "ja_confirmado" ? "Este portal já foi usado."
          : "Portal não encontrado."
        );
        setEstado("erro");
      } catch (e) { setMsg("Não consegui falar com o servidor."); setEstado("erro"); }
    })();
    // eslint-disable-next-line
  }, [codigo]);

  const responder = async (entrar) => {
    setOcupado(true);
    try {
      const jwt = await tokenAtual();
      const r = await fetch(entrar ? "/api/world/confirmar" : "/api/world/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ codigo }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(rotuloErro(j.status)); setEstado("erro"); return; }
      setEstado(entrar ? "ok" : "recusado");
    } catch (e) { setMsg("Não consegui responder agora."); setEstado("erro"); }
    finally { setOcupado(false); }
  };

  const rotuloErro = (s) => s === "expirado" ? "Este portal expirou."
    : s === "ja_confirmado" ? "Este portal já foi usado."
    : s === "cancelado" ? "Este portal foi cancelado." : "Não deu certo.";

  return (
    <main style={{ background: `radial-gradient(circle at 50% 0%, ${C.night2}, ${C.night})`, minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 font-sans">
      <div style={{ background: C.parch, border: `3px solid ${C.goldDeep}`, boxShadow: "0 8px 0 rgba(0,0,0,.3)" }}
        className="w-full max-w-sm rounded-2xl p-6 text-center">

        {estado === "carregando" && (
          <p style={{ color: C.inkSoft }} className="animate-pulse py-8 font-bold">procurando o portal…</p>
        )}

        {estado === "pedindoLogin" && (
          <>
            <div className="text-4xl">🔒</div>
            <h1 style={{ color: C.ink }} className="mt-2 font-serif text-xl font-black">Entre no QuesTAH primeiro</h1>
            <p style={{ color: C.inkSoft }} className="mt-2 text-sm">
              Abra o app, faça login e escaneie o código de novo.
            </p>
            <a href="/" style={{ background: C.gold, color: C.ink }}
              className="mt-5 block rounded-xl py-3 font-serif font-black">Abrir o QuesTAH</a>
          </>
        )}

        {estado === "aguardando" && info && (
          <>
            <div className="text-4xl">🌐</div>
            <h1 style={{ color: C.ink }} className="mt-2 font-serif text-2xl font-black">Portal encontrado</h1>
            <p style={{ color: C.inkSoft }} className="mt-2 text-sm">
              Um computador está tentando entrar no seu QuesTAH.
            </p>
            <p style={{ color: C.inkSoft }} className="mt-1 text-xs">{info.computador}</p>

            <div className="mt-5 rounded-xl py-3" style={{ background: "rgba(0,0,0,.05)" }}>
              <div style={{ color: C.inkSoft }} className="text-[10px] font-bold uppercase tracking-widest">
                Confira o código na tela
              </div>
              <div style={{ color: C.goldDeep, letterSpacing: "0.3em" }} className="font-serif text-4xl font-black">
                {info.numero}
              </div>
            </div>
            <p style={{ color: C.inkSoft }} className="mt-2 text-[11px]">
              Só entre se este número for o mesmo que aparece no computador.
            </p>

            <div className="mt-5 flex gap-2">
              <button onClick={() => responder(false)} disabled={ocupado}
                style={{ background: "rgba(0,0,0,.08)", color: C.ink }}
                className="flex-1 rounded-xl py-3 font-bold active:scale-95 transition">Cancelar</button>
              <button onClick={() => responder(true)} disabled={ocupado}
                style={{ background: C.gold, color: C.ink, opacity: ocupado ? 0.6 : 1 }}
                className="flex-1 rounded-xl py-3 font-serif font-black active:scale-95 transition">
                {ocupado ? "…" : "Entrar"}
              </button>
            </div>
          </>
        )}

        {estado === "ok" && (
          <>
            <div className="text-5xl">✨</div>
            <h1 style={{ color: C.ink }} className="mt-2 font-serif text-2xl font-black">Portal aberto</h1>
            <p style={{ color: C.inkSoft }} className="mt-2 text-sm">
              Seu mundo já está abrindo no computador. Pode voltar para o jogo.
            </p>
            <a href="/" style={{ background: C.gold, color: C.ink }}
              className="mt-5 block rounded-xl py-3 font-serif font-black">Voltar ao QuesTAH</a>
          </>
        )}

        {estado === "recusado" && (
          <>
            <div className="text-4xl">🚫</div>
            <h1 style={{ color: C.ink }} className="mt-2 font-serif text-xl font-black">Portal recusado</h1>
            <p style={{ color: C.inkSoft }} className="mt-2 text-sm">Nada foi aberto. Tudo certo.</p>
            <a href="/" style={{ color: C.goldDeep }} className="mt-5 block text-sm font-bold underline">Voltar ao QuesTAH</a>
          </>
        )}

        {estado === "erro" && (
          <>
            <div className="text-4xl">⌛</div>
            <h1 style={{ color: C.ink }} className="mt-2 font-serif text-xl font-black">{msg}</h1>
            <a href="/" style={{ color: C.goldDeep }} className="mt-5 block text-sm font-bold underline">Voltar ao QuesTAH</a>
          </>
        )}
      </div>
    </main>
  );
}
