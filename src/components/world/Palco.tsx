// @ts-nocheck
"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/**
 * O palco: decide SE o 3D pode entrar, e só então o carrega.
 *
 * Duas garantias:
 *  - `ssr: false` + import dinâmico → o three.js sai num pedaço separado, que
 *    só o computador baixa, e só quando chega aqui. O celular não paga nada.
 *  - se o navegador não tiver WebGL (PC antigo, aceleração desligada, máquina
 *    virtual), a página NÃO quebra: some a cena e ficam os dados em texto, que
 *    é o World 0 inteiro, funcionando como sempre funcionou.
 */
const Cena = dynamic(() => import("./Cena"), { ssr: false });

/** Teclinha do rodapé — só enfeite, para a dica ser lida sem esforço. */
function Tecla({ children }) {
  return (
    <kbd style={{ background: "rgba(244,230,197,.14)", border: "1px solid rgba(244,230,197,.3)", color: "#f4e6c5" }}
      className="mx-[1px] inline-block rounded px-1.5 py-0.5 font-sans text-[10px] font-bold leading-none">
      {children}
    </kbd>
  );
}

/** Testa WebGL sem depender do three: um canvas descartável e pronto. */
function temWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) {
    return false;
  }
}

export default function Palco({ classeId, nome, classeNome, classeEmoji, regioes }) {
  const [estado, setEstado] = useState("checando"); // checando | pronto | semWebGL

  useEffect(() => {
    setEstado(temWebGL() ? "pronto" : "semWebGL");
  }, []);

  if (estado === "semWebGL") {
    return (
      <div style={{ background: "rgba(244,230,197,.06)", border: "2px solid #b3801c" }}
        className="mt-5 rounded-2xl p-5 text-center">
        <p style={{ color: "#ead2a0" }} className="text-sm">
          Este computador não conseguiu abrir o 3D, mas o seu mundo está aqui embaixo, inteiro.
        </p>
        <p style={{ color: "#ead2a0" }} className="mt-1 text-xs opacity-70">
          Costuma ser a aceleração de vídeo desligada no navegador.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: "2px solid #b3801c", background: "#0f0b1c" }}
      className="mt-5 overflow-hidden rounded-2xl">
      <div style={{ height: 460 }}>
        {estado === "pronto"
          ? <Cena classeId={classeId} regioes={regioes} altura={460} />
          : <div className="flex h-full items-center justify-center">
              <span style={{ color: "#ead2a0" }} className="animate-pulse font-serif">
                ✨ desenhando o seu mundo…
              </span>
            </div>}
      </div>

      {/* Todo texto fica FORA do Canvas — nada de fonte 3D baixada pela rede. */}
      <div style={{ background: "rgba(244,230,197,.06)" }} className="px-5 py-3 text-center">
        <div style={{ color: "#f4e6c5" }} className="font-serif text-lg font-black">{nome}</div>
        <div style={{ color: "#ead2a0" }} className="text-xs">
          {classeNome ? `${classeEmoji} ${classeNome}` : "herói sem classe definida"}
        </div>
        <div style={{ color: "#ead2a0" }} className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs opacity-80">
          <span><Tecla>W</Tecla><Tecla>A</Tecla><Tecla>S</Tecla><Tecla>D</Tecla> ou <Tecla>←</Tecla><Tecla>↑</Tecla><Tecla>↓</Tecla><Tecla>→</Tecla> andar</span>
          <span><Tecla>espaço</Tecla> pular</span>
          <span>arrastar com o mouse: girar</span>
          <span>rodinha: aproximar</span>
        </div>
        <div style={{ color: "#ead2a0" }} className="mt-1 text-[11px] opacity-55">
          o teclado só comanda o herói com o mouse em cima da cena
        </div>
      </div>
    </div>
  );
}
