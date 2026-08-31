// @ts-nocheck
"use client";
import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, ContactShadows } from "@react-three/drei";
import { visualDaClasse, CORES } from "@/lib/worldVisual";

/* ============================================================
   QUESTAH WORLD — World 1: a primeira cena

   Chão, céu, luz, câmera orbital e o herói em blocos — que agora
   ANDA e PULA no comando do teclado.

   DUAS COISAS QUE NÃO ENTRAM AQUI, e não é esquecimento:

   1. `<Environment preset="..." />` do drei BAIXA um arquivo HDRI
      de um servidor externo. O mundo ficaria dependendo de uma CDN
      de terceiro para acender a luz. Usamos luzes de verdade.
   2. `<Text />` do drei baixa uma fonte pela rede (troika). Todo
      texto desta tela é HTML comum, fora do Canvas.

   Ambas funcionariam no meu teste e falhariam na vida real.
   ============================================================ */

const RAIO_DO_MUNDO = 12.5;   // até onde dá para andar
const VELOCIDADE = 3.4;        // metros por segundo
const FORCA_DO_PULO = 5.0;
const GRAVIDADE = 14;

/* ---------- teclado ----------------------------------------------------- */

const MOVIMENTO = {
  frente:   ["KeyW", "ArrowUp"],
  tras:     ["KeyS", "ArrowDown"],
  esquerda: ["KeyA", "ArrowLeft"],
  direita:  ["KeyD", "ArrowRight"],
  pulo:     ["Space"],
};
const TODAS = new Set(Object.values(MOVIMENTO).flat());

/**
 * Escuta o teclado — mas só manda no herói quando o mouse está EM CIMA da cena.
 *
 * Sem essa condição, as setas e o espaço parariam de rolar a página, e os dados
 * em texto que ficam logo abaixo virariam um inferno de ler. Com ela, a regra
 * fica óbvia sem precisar explicar: mouse na cena, você controla o herói; mouse
 * fora, a página é uma página.
 */
function useTeclado(ativo) {
  const teclas = useRef({});
  useEffect(() => {
    const apertou = (e) => {
      if (!ativo.current) return;
      if (TODAS.has(e.code)) {
        teclas.current[e.code] = true;
        e.preventDefault();   // espaço e setas rolam a página; aqui não
      }
    };
    const soltou = (e) => { teclas.current[e.code] = false; };
    // se a janela perde o foco no meio de um passo, o herói sairia andando
    // para sempre — soltamos tudo.
    const largarTudo = () => { teclas.current = {}; };

    window.addEventListener("keydown", apertou, { passive: false });
    window.addEventListener("keyup", soltou);
    window.addEventListener("blur", largarTudo);
    return () => {
      window.removeEventListener("keydown", apertou);
      window.removeEventListener("keyup", soltou);
      window.removeEventListener("blur", largarTudo);
    };
  }, [ativo]);

  return useMemo(() => ({
    apertada: (nome) => MOVIMENTO[nome].some((c) => teclas.current[c]),
  }), []);
}

/** Interpola ângulos pelo caminho curto — sem isso o herói gira 350° para
 *  virar 10° quando cruza o −π/π. */
function lerpAngulo(de, para, t) {
  let d = ((para - de + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return de + d * t;
}

/* ---------- o corpo ----------------------------------------------------- */

/**
 * Só a forma. Recebe os ângulos já calculados e os aplica.
 *
 * Está separado de propósito: quando entrarem os modelos de personagem de
 * verdade, é ESTE componente que é trocado — a lógica de andar, pular e virar
 * fica de pé, intocada.
 */
function CorpoDeBlocos({ cor, detalhe, balanco }) {
  const pernaE = useRef(), pernaD = useRef(), bracoE = useRef(), bracoD = useRef();

  useFrame(() => {
    if (!pernaE.current) return;
    pernaE.current.rotation.x = balanco.current;
    pernaD.current.rotation.x = -balanco.current;
    bracoE.current.rotation.x = -balanco.current * 0.8;
    bracoD.current.rotation.x = balanco.current * 0.8;
  });

  return (
    <>
      {/* pernas — o pivô fica no quadril, para a perna girar a partir dali */}
      <group ref={pernaE} position={[-0.17, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.26, 0.7, 0.28]} />
          <meshStandardMaterial color={detalhe} />
        </mesh>
      </group>
      <group ref={pernaD} position={[0.17, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.26, 0.7, 0.28]} />
          <meshStandardMaterial color={detalhe} />
        </mesh>
      </group>

      {/* tronco */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.72, 0.8, 0.4]} />
        <meshStandardMaterial color={cor} />
      </mesh>

      {/* braços — pivô no ombro */}
      <group ref={bracoE} position={[-0.5, 1.38, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <boxGeometry args={[0.22, 0.68, 0.26]} />
          <meshStandardMaterial color={cor} />
        </mesh>
      </group>
      <group ref={bracoD} position={[0.5, 1.38, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <boxGeometry args={[0.22, 0.68, 0.26]} />
          <meshStandardMaterial color={cor} />
        </mesh>
      </group>

      {/* cabeça */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <boxGeometry args={[0.5, 0.46, 0.46]} />
        <meshStandardMaterial color={CORES.pele} />
      </mesh>
    </>
  );
}

/* ---------- o herói: movimento --------------------------------------- */

function Heroi({ classeId, ativo, corpoRef }) {
  const grupo = useRef();
  const { cor, detalhe } = useMemo(() => visualDaClasse(classeId), [classeId]);
  const teclado = useTeclado(ativo);
  const { camera } = useThree();

  const vel = useRef({ x: 0, z: 0 });
  const alturaPulo = useRef(0);
  const velVertical = useRef(0);
  const noChao = useRef(true);
  const fase = useRef(0);
  const balanco = useRef(0);

  useFrame((estado, dt) => {
    const g = grupo.current;
    if (!g) return;
    const passo = Math.min(dt, 0.05);   // aba travada não teleporta o herói

    // ---- para onde as teclas querem ir, em relação à CÂMERA ----
    // "para frente" é para longe de quem olha — é o que a mão espera. Calculado
    // com a posição da câmera, sem precisar importar o THREE aqui.
    const dir = { x: 0, z: 0 };
    const cf = { x: camera.position.x - g.position.x, z: camera.position.z - g.position.z };
    const dist = Math.hypot(cf.x, cf.z) || 1;
    // "para frente" = para longe da câmera
    const fx = -cf.x / dist, fz = -cf.z / dist;
    const rx = -fz, rz = fx;   // 90° à direita

    if (teclado.apertada("frente"))   { dir.x += fx; dir.z += fz; }
    if (teclado.apertada("tras"))     { dir.x -= fx; dir.z -= fz; }
    if (teclado.apertada("direita"))  { dir.x += rx; dir.z += rz; }
    if (teclado.apertada("esquerda")) { dir.x -= rx; dir.z -= rz; }

    const tam = Math.hypot(dir.x, dir.z);
    const andando = tam > 0.001;
    if (andando) { dir.x /= tam; dir.z /= tam; }

    // ---- velocidade suavizada: partida e parada não são secas ----
    const alvoX = andando ? dir.x * VELOCIDADE : 0;
    const alvoZ = andando ? dir.z * VELOCIDADE : 0;
    const suav = 1 - Math.pow(0.001, passo);
    vel.current.x += (alvoX - vel.current.x) * suav;
    vel.current.z += (alvoZ - vel.current.z) * suav;

    g.position.x += vel.current.x * passo;
    g.position.z += vel.current.z * passo;

    // ---- a borda do mundo: chega até ela e para, sem cair ----
    const r = Math.hypot(g.position.x, g.position.z);
    if (r > RAIO_DO_MUNDO) {
      g.position.x = (g.position.x / r) * RAIO_DO_MUNDO;
      g.position.z = (g.position.z / r) * RAIO_DO_MUNDO;
    }

    // ---- virar para onde anda ----
    if (andando) {
      g.rotation.y = lerpAngulo(g.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.pow(0.0001, passo));
    }

    // ---- pulo ----
    if (teclado.apertada("pulo") && noChao.current) {
      velVertical.current = FORCA_DO_PULO;
      noChao.current = false;
    }
    if (!noChao.current) {
      velVertical.current -= GRAVIDADE * passo;
      alturaPulo.current += velVertical.current * passo;
      if (alturaPulo.current <= 0) {
        alturaPulo.current = 0;
        velVertical.current = 0;
        noChao.current = true;
      }
    }

    // ---- balanço de pernas e braços ----
    const rapidez = Math.hypot(vel.current.x, vel.current.z);
    if (!noChao.current) {
      // no ar as pernas ficam abertas, sem pedalar
      balanco.current += (0.45 - balanco.current) * (1 - Math.pow(0.01, passo));
    } else if (rapidez > 0.15) {
      fase.current += rapidez * 3.1 * passo;
      balanco.current = Math.sin(fase.current) * 0.75;
    } else {
      balanco.current += (0 - balanco.current) * (1 - Math.pow(0.0005, passo));
    }

    // ---- respiração, só quando parado ----
    const t = estado.clock.getElapsedTime();
    const respiro = rapidez < 0.15 && noChao.current ? Math.sin(t * 1.4) * 0.035 : 0;
    g.position.y = alturaPulo.current + respiro;

    if (corpoRef) corpoRef.current = g.position;
  });

  return (
    <group ref={grupo}>
      <CorpoDeBlocos cor={cor} detalhe={detalhe} balanco={balanco} />
    </group>
  );
}

/**
 * A câmera segue o herói sem deixar de ser orbital.
 *
 * O detalhe que quebra: NÃO basta mover o alvo. A `OrbitControls` recalcula o
 * deslocamento entre câmera e alvo a cada `update()`; movendo só o alvo, esse
 * deslocamento cresce sozinho e o herói vai encolhendo até virar um pontinho no
 * horizonte. A câmera precisa andar o MESMO tanto que o alvo.
 */
function CameraSegue({ controles, corpoRef }) {
  useFrame(() => {
    const c = controles.current, p = corpoRef.current;
    if (!c || !p) return;
    const dx = (p.x - c.target.x) * 0.12;
    const dy = (1.0 - c.target.y) * 0.12;
    const dz = (p.z - c.target.z) * 0.12;

    c.target.x += dx; c.target.y += dy; c.target.z += dz;
    c.object.position.x += dx; c.object.position.y += dy; c.object.position.z += dz;
    c.update();
  });
  return null;
}

/** O chão. Um disco, para o mundo não ter beirada quadrada. */
function Chao() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[RAIO_DO_MUNDO + 1.5, 64]} />
      <meshStandardMaterial color={CORES.chao} />
    </mesh>
  );
}

/**
 * Sorteio com semente fixa.
 *
 * O capim precisa nascer no MESMO lugar toda vez que você entra. Com
 * `Math.random()` o mundo se reembaralharia a cada visita — e "o mundo nunca
 * regride" também quer dizer que ele não vira outro mundo enquanto você
 * pisca.
 */
function sorteio(semente) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Moitas e pedras espalhadas.
 *
 * Não é enfeite: sem nenhum ponto de referência, andar num campo verde liso é
 * visualmente IGUAL a ficar parado, porque a câmera acompanha o herói. Estes
 * volumes são o que faz o movimento existir aos olhos.
 *
 * Continua sendo "validar com cubos" (§12): são cones e caixas, não é arte.
 */
function Cenario() {
  const pecas = useMemo(() => {
    const r = sorteio(20260824);
    const lista = [];
    for (let i = 0; i < 90; i++) {
      const ang = r() * Math.PI * 2;
      // raiz quadrada distribui por área, senão tudo se amontoa no meio
      const dist = 2.5 + Math.sqrt(r()) * (RAIO_DO_MUNDO - 1.5);
      const pedra = r() < 0.28;
      lista.push({
        chave: i,
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        giro: r() * Math.PI * 2,
        escala: 0.7 + r() * 0.8,
        pedra,
      });
    }
    return lista;
  }, []);

  return (
    <group>
      {pecas.map((p) => (
        <mesh
          key={p.chave}
          position={[p.x, p.pedra ? 0.16 * p.escala : 0.42 * p.escala, p.z]}
          rotation={[0, p.giro, 0]}
          scale={p.escala}
          castShadow
          receiveShadow
        >
          {p.pedra
            ? <dodecahedronGeometry args={[0.28, 0]} />
            : <coneGeometry args={[0.36, 0.85, 5]} />}
          <meshStandardMaterial color={p.pedra ? "#7b7a74" : "#54924a"} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A sombra do sol precisa acompanhar o herói, senão ele anda para fora dela. */
function SolSegue({ corpoRef }) {
  const luz = useRef();
  useFrame(() => {
    const p = corpoRef.current;
    if (!luz.current || !p) return;
    luz.current.position.set(p.x + 5, 6, p.z + 5);
    luz.current.target.position.set(p.x, 0, p.z);
    luz.current.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={luz}
      position={[5, 6, 5]}
      color="#ffdca8"
      intensity={2.0}
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-7}
      shadow-camera-right={7}
      shadow-camera-top={7}
      shadow-camera-bottom={-7}
    />
  );
}

export default function Cena({ classeId = null, altura = 460 }) {
  const controles = useRef();
  const corpoRef = useRef({ x: 0, y: 0, z: 0 });
  const ativo = useRef(false);

  return (
    <div
      style={{ height: altura, width: "100%" }}
      onPointerEnter={() => { ativo.current = true; }}
      onPointerLeave={() => { ativo.current = false; }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2.5, 1.9, 3.5], fov: 42 }}
        style={{ height: "100%", width: "100%" }}
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

        <hemisphereLight args={[CORES.ceuAlto, CORES.chaoEscuro, 0.6]} />
        <SolSegue corpoRef={corpoRef} />

        <Chao />
        <Cenario />
        <Heroi classeId={classeId} ativo={ativo} corpoRef={corpoRef} />

        <OrbitControls
          ref={controles}
          enablePan={false}
          minDistance={3}
          maxDistance={14}
          // trava a câmera acima do chão: nunca dá para olhar o mundo por baixo
          maxPolarAngle={Math.PI / 2 - 0.05}
          minPolarAngle={0.15}
          enableDamping
        />
        <CameraSegue controles={controles} corpoRef={corpoRef} />
      </Canvas>
    </div>
  );
}
