// @ts-nocheck
"use client";
import React from "react";
import { Html } from "@react-three/drei";
import { ARQUETIPOS } from "@/lib/worldRegioes";
import { misturar, CORES } from "@/lib/worldVisual";

/* ============================================================
   UMA REGIÃO — a categoria virada lugar (World 2)

   Este componente NÃO sabe o que é "Trabalho" ou "Casa". Ele
   recebe um arquétipo e um tamanho, e monta. É por isso que o
   World 3 (todas as regiões) vira um laço em volta disto, e não
   dez componentes novos.

   Nada aqui é arte: são caixas, cones e pirâmides. O roadmap
   (§12) manda validar com cubos antes de encomendar modelo.
   ============================================================ */

/** Telhado de quatro águas — um cone de 4 lados, girado para virar pirâmide. */
function Telhado({ largura, altura, cor, y }) {
  return (
    <mesh position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[largura * 0.78, altura, 4]} />
      <meshStandardMaterial color={cor} flatShading />
    </mesh>
  );
}

/** As construções que o mundo sabe montar. Um arquétipo escolhe uma delas. */
function Construcao({ tipo, cor, telhado, escala = 1 }) {
  const s = escala;
  switch (tipo) {
    case "torre":
      return (
        <group>
          <mesh position={[0, 1.5 * s, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9 * s, 3 * s, 0.9 * s]} />
            <meshStandardMaterial color={cor} />
          </mesh>
          <Telhado largura={0.9 * s} altura={0.75 * s} cor={telhado} y={3.35 * s} />
        </group>
      );
    case "galpao":
      return (
        <group>
          <mesh position={[0, 0.55 * s, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4 * s, 1.1 * s, 1.5 * s]} />
            <meshStandardMaterial color={cor} />
          </mesh>
          <Telhado largura={2.0 * s} altura={0.5 * s} cor={telhado} y={1.35 * s} />
        </group>
      );
    case "tenda":
      return (
        <mesh position={[0, 0.8 * s, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.0 * s, 1.6 * s, 6]} />
          <meshStandardMaterial color={telhado} flatShading />
        </mesh>
      );
    case "santuario":
      return (
        <group>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x * s, 0.8 * s, 0]} castShadow>
              <cylinderGeometry args={[0.13 * s, 0.13 * s, 1.6 * s, 8]} />
              <meshStandardMaterial color={cor} />
            </mesh>
          ))}
          <mesh position={[0, 1.7 * s, 0]} castShadow>
            <boxGeometry args={[2.0 * s, 0.2 * s, 1.0 * s]} />
            <meshStandardMaterial color={telhado} />
          </mesh>
        </group>
      );
    case "arvoreG":
      return (
        <group>
          <mesh position={[0, 0.55 * s, 0]} castShadow>
            <cylinderGeometry args={[0.16 * s, 0.22 * s, 1.1 * s, 6]} />
            <meshStandardMaterial color="#6b4a2f" />
          </mesh>
          <mesh position={[0, 1.65 * s, 0]} castShadow>
            <coneGeometry args={[1.0 * s, 2.0 * s, 7]} />
            <meshStandardMaterial color={telhado} flatShading />
          </mesh>
        </group>
      );
    case "casa":
    default:
      return (
        <group>
          <mesh position={[0, 0.5 * s, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.3 * s, 1.0 * s, 1.3 * s]} />
            <meshStandardMaterial color={cor} />
          </mesh>
          <Telhado largura={1.3 * s} altura={0.7 * s} cor={telhado} y={1.35 * s} />
        </group>
      );
  }
}

/** Os detalhes pequenos: o que enche o chão da região. */
function Adorno({ tipo, cor }) {
  switch (tipo) {
    case "poste":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 1.0, 6]} />
            <meshStandardMaterial color="#4a4a52" />
          </mesh>
          <mesh position={[0, 1.05, 0]} castShadow>
            <sphereGeometry args={[0.13, 8, 8]} />
            <meshStandardMaterial color="#ffe9a8" emissive="#ffca5a" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    case "pedra":
      return (
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial color="#7b7a74" flatShading />
        </mesh>
      );
    case "flor":
      return (
        <group>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.32, 4]} />
            <meshStandardMaterial color="#4d7a3a" />
          </mesh>
          <mesh position={[0, 0.36, 0]} castShadow>
            <sphereGeometry args={[0.11, 7, 7]} />
            <meshStandardMaterial color={cor} />
          </mesh>
        </group>
      );
    case "arvore":
    default:
      return (
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.38, 0.9, 5]} />
          <meshStandardMaterial color="#54924a" flatShading />
        </mesh>
      );
  }
}

export default function Regiao({ layout }) {
  if (!layout) return null;
  const { centro, arquetipo, cor, nome, emoji, desenvolvimento, conclusoes, construcoes, adornos } = layout;
  const arq = ARQUETIPOS[arquetipo] || ARQUETIPOS.generico;

  return (
    <group position={[centro.x, 0, centro.z]}>
      {/* O chão da região: o gramado TINGIDO com a cor que o jogador escolheu
          para a categoria, não a cor pura. Cor pura vira mancha — um "Casa"
          azul virava um lago no meio do campo. Tingido, continua sendo chão e
          ainda assim é reconhecidamente dele.
          Fica um dedo acima do gramado para os dois não brigarem por profundidade. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[layout.raio, 48]} />
        <meshStandardMaterial color={misturar(CORES.chao, cor, 0.42)} />
      </mesh>

      {construcoes.map((c) => (
        <group key={c.chave} position={[c.x, 0, c.z]} rotation={[0, c.giro, 0]}>
          <Construcao tipo={arq.construcao} cor={c.corParede} telhado={arq.telhado} escala={c.escala} />
        </group>
      ))}

      {adornos.map((a) => (
        <group key={a.chave} position={[a.x, 0, a.z]} rotation={[0, a.giro, 0]} scale={a.escala}>
          <Adorno tipo={arq.adorno} cor={cor} />
        </group>
      ))}

      {/* A placa da região. HTML de verdade, projetado na cena — o <Text> do
          drei baixaria uma fonte de servidor de terceiro. */}
      {/* Baixa o bastante para não ser cortada pelo topo da cena quando você
          avista a região de longe — que é justamente quando ela mais importa. */}
      <Html position={[0, 2.5, 0]} center distanceFactor={18} zIndexRange={[10, 0]}>
        <div
          style={{
            background: "rgba(27,20,48,.88)", border: `2px solid ${cor}`,
            color: "#f4e6c5", padding: "6px 12px", borderRadius: 12,
            fontFamily: "ui-sans-serif, system-ui, sans-serif", textAlign: "center",
            whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800 }}>{emoji} {nome}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>
            {arq.rotulo} · {conclusoes} conclusões · {desenvolvimento}%
          </div>
        </div>
      </Html>
    </group>
  );
}
