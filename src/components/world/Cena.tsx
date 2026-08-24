// @ts-nocheck
"use client";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sky, ContactShadows } from "@react-three/drei";
import { visualDaClasse, CORES } from "@/lib/worldVisual";

/* ============================================================
   QUESTAH WORLD — World 1: a primeira cena

   Chão, céu, luz, câmera orbital e o herói em blocos. Nada além
   disso de propósito: o roadmap manda validar com cubos antes de
   encomendar arte 3D (§12).

   DUAS COISAS QUE NÃO ENTRAM AQUI, e não é esquecimento:

   1. `<Environment preset="..." />` do drei BAIXA um arquivo HDRI
      de um servidor externo. O mundo ficaria dependendo de uma CDN
      de terceiro para acender a luz. Usamos luzes de verdade.
   2. `<Text />` do drei baixa uma fonte pela rede (troika). Todo
      texto desta tela é HTML comum, fora do Canvas.

   Ambas funcionariam no meu teste e falhariam na vida real.
   ============================================================ */

/** O herói. Blocos, porque em World 1 a forma ainda não importa — a presença sim. */
function Heroi({ classeId }) {
  const grupo = useRef();
  const { cor, detalhe } = useMemo(() => visualDaClasse(classeId), [classeId]);

  // Respiração: o mundo precisa parecer vivo mesmo parado.
  useFrame(({ clock }) => {
    if (!grupo.current) return;
    const t = clock.getElapsedTime();
    grupo.current.position.y = Math.sin(t * 1.4) * 0.035;
    grupo.current.rotation.y = Math.sin(t * 0.35) * 0.12;
  });

  return (
    <group ref={grupo}>
      {/* pernas */}
      <mesh position={[-0.17, 0.35, 0]} castShadow>
        <boxGeometry args={[0.26, 0.7, 0.28]} />
        <meshStandardMaterial color={detalhe} />
      </mesh>
      <mesh position={[0.17, 0.35, 0]} castShadow>
        <boxGeometry args={[0.26, 0.7, 0.28]} />
        <meshStandardMaterial color={detalhe} />
      </mesh>

      {/* tronco */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.72, 0.8, 0.4]} />
        <meshStandardMaterial color={cor} />
      </mesh>

      {/* braços */}
      <mesh position={[-0.48, 1.05, 0]} castShadow>
        <boxGeometry args={[0.22, 0.68, 0.26]} />
        <meshStandardMaterial color={cor} />
      </mesh>
      <mesh position={[0.48, 1.05, 0]} castShadow>
        <boxGeometry args={[0.22, 0.68, 0.26]} />
        <meshStandardMaterial color={cor} />
      </mesh>

      {/* cabeça */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <boxGeometry args={[0.5, 0.46, 0.46]} />
        <meshStandardMaterial color={CORES.pele} />
      </mesh>
    </group>
  );
}

/** O chão. Um disco, para o mundo não ter beirada quadrada. */
function Chao() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[14, 64]} />
      <meshStandardMaterial color={CORES.chao} />
    </mesh>
  );
}

export default function Cena({ classeId = null, altura = 460 }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.5, 1.9, 3.5], fov: 42 }}
      style={{ height: altura, width: "100%" }}
    >
      {/* Fim de tarde, não meio-dia: o sol baixo dá o dourado do QuesTAH e
          alonga as sombras. Céu de meio-dia fica lavado e genérico. */}
      <Sky
        sunPosition={[7, 2.2, 7]}
        turbidity={5}
        rayleigh={2.2}
        mieCoefficient={0.006}
        mieDirectionalG={0.9}
      />

      {/* Luz: sol + preenchimento. Sem HDRI, sem rede. */}
      <hemisphereLight args={[CORES.ceuAlto, CORES.chaoEscuro, 0.6]} />
      <directionalLight
        position={[5, 6, 5]}
        color="#ffdca8"
        intensity={2.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <Chao />
      <Heroi classeId={classeId} />

      {/* A sombra de contato é redesenhada a cada quadro e ficava POR CIMA da
          sombra real do sol — duas sombras pelo preço de duas. `frames={1}`
          desenha uma vez e congela: some o custo por quadro e a imagem fica
          igual, porque o herói só respira no lugar. */}
      <ContactShadows frames={1} position={[0, 0.015, 0]} opacity={0.35} scale={8} blur={2.4} far={3} />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        // trava a câmera acima do chão: nunca dá para olhar o mundo por baixo
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.15}
        target={[0, 1.0, 0]}
        enableDamping
      />
    </Canvas>
  );
}
