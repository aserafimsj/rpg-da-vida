"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabaseClient";
import RpgDaVida from "@/components/RpgDaVida";

const NIGHT = "#1b1430";
const NIGHT2 = "#241a40";
const PARCH = "#f4e6c5";
const GOLD = "#e8b339";
const GOLD_DEEP = "#b3801c";
const INK = "#3a2a18";
const INK_SOFT = "#6b5436";
const XP_DEEP = "#3c9a4c";

export default function Page() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (!ready) {
    return (
      <main
        style={{ background: NIGHT, color: PARCH, minHeight: "100vh" }}
        className="flex items-center justify-center font-serif text-xl"
      >
        <div className="animate-pulse">⚔️ Carregando…</div>
      </main>
    );
  }

  if (!session) return <Login />;

  return <RpgDaVida user={session.user} onSignOut={() => supabase.auth.signOut()} />;
}

function Login() {
  const supabase = getSupabase();
  const [mode, setMode] = useState<"home" | "email">("home");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const playNow = async () => {
    setStatus("sending");
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setStatus("error");
      setMsg(
        error.message?.toLowerCase().includes("anonymous")
          ? "O acesso anônimo precisa ser ativado no Supabase (Authentication → Sign In / Providers → Anonymous)."
          : error.message
      );
    }
    // sucesso: o onAuthStateChange carrega o jogo
  };

  const send = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("error");
      setMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <main
      style={{ background: `radial-gradient(circle at 50% 0%, ${NIGHT2}, ${NIGHT})`, minHeight: "100vh" }}
      className="flex items-center justify-center px-4 font-sans"
    >
      <div
        style={{ background: PARCH, border: `3px solid ${GOLD_DEEP}`, boxShadow: "0 8px 0 rgba(0,0,0,.3)" }}
        className="w-full max-w-sm rounded-2xl p-6 text-center"
      >
        <div className="text-5xl">⚔️</div>
        <h1 style={{ color: INK }} className="mt-2 font-serif text-3xl font-black tracking-tight">
          Ques<span style={{ color: GOLD_DEEP }}>TAH</span>
        </h1>
        <p style={{ color: INK_SOFT }} className="mt-1 text-sm">
          Sua rotina vira aventura. Feito para mentes com TDAH.
        </p>

        {mode === "home" && (
          <>
            <button
              onClick={playNow}
              disabled={status === "sending"}
              style={{ background: GOLD, color: INK, opacity: status === "sending" ? 0.6 : 1 }}
              className="mt-5 w-full rounded-xl py-3 font-serif text-lg font-black active:scale-95 transition"
            >
              {status === "sending" ? "Entrando…" : "▶ Jogar agora"}
            </button>
            <p style={{ color: INK_SOFT }} className="mt-2 text-xs">
              Sem cadastro. Você adiciona seu e-mail depois, nas Configurações, para salvar o progresso.
            </p>
            <button
              onClick={() => { setMode("email"); setStatus("idle"); }}
              style={{ color: GOLD_DEEP }}
              className="mt-4 text-sm font-bold underline"
            >
              Já tenho conta — entrar com e-mail
            </button>
            {status === "error" && <p className="mt-3 text-sm" style={{ color: "#c0392b" }}>{msg}</p>}
          </>
        )}

        {mode === "email" && (
          status === "sent" ? (
            <div style={{ color: XP_DEEP }} className="mt-5 font-bold">
              📬 Link enviado! Confira seu e-mail (e o spam) e toque no link para entrar.
            </div>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="seu@email.com"
                style={{ borderColor: GOLD_DEEP, color: INK }}
                className="mt-5 w-full rounded-xl border-2 bg-white/70 px-4 py-3 text-center outline-none"
              />
              <button
                onClick={send}
                disabled={status === "sending"}
                style={{ background: GOLD, color: INK, opacity: status === "sending" ? 0.6 : 1 }}
                className="mt-3 w-full rounded-xl py-3 font-serif font-black active:scale-95 transition"
              >
                {status === "sending" ? "Enviando…" : "Receber link mágico"}
              </button>
              {status === "error" && (
                <p className="mt-3 text-sm" style={{ color: "#c0392b" }}>{msg}</p>
              )}
              <button onClick={() => { setMode("home"); setStatus("idle"); }} style={{ color: INK_SOFT }} className="mt-4 text-sm font-bold">← Voltar</button>
            </>
          )
        )}
      </div>
    </main>
  );
}
