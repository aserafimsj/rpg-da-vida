// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
/* ============================================================
   RESERVADO — matéria-prima da Criação do Herói (Fase 5).
   Não importar.

   Construtor de avatar e pet em SVG (espécies, cores, cabelos,
   roupas, acessórios) que saiu de circulação quando o app passou
   a usar ilustrações prontas. O código fica aqui inteiro porque
   é a base do editor de personagem do onboarding.

   Este arquivo é deliberadamente autocontido: não importa nada do
   app e nada do app importa dele.
   ============================================================ */
import React from "react";

const C = { gold: "#e8b339", goldDeep: "#b3801c" };
const DEFAULT_PET = { name: "Monstrinho", species: "gato", color: "#ffffff" };
const DEFAULT_AVATAR = { skin: "#eebd96", hair: "curto", hairColor: "#2b2118", outfit: "camiseta", accessory: "nenhum" };
/** No app real isto lê os cosméticos equipados do save. */
function cosmeticEmoji(_data, _slot) { return null; }

const PET_SPECIES = [
  { id: "gato", label: "Gato", emoji: "🐱" },
  { id: "cachorro", label: "Cão", emoji: "🐶" },
  { id: "coelho", label: "Coelho", emoji: "🐰" },
  { id: "urso", label: "Urso", emoji: "🐻" },
];
const PET_COLORS = ["#ffffff", "#f4c542", "#e2a16f", "#b97a56", "#8a8f99", "#3a3a44", "#f6a5c0", "#9ad0c2"];
const IMG_SPECIES = ["gato"]; // espécies com ilustração pronta (sem cor/SVG)
const CAT_IMG = {
  feliz: "/pets/feliz.png",
  realeza: "/pets/realeza.png",
  sono: "/pets/sono.png",
  triste: "/pets/triste.png",
  brava: "/pets/brava.png",
};
const CAT_STAGE_IMG = ["sono", "feliz", "feliz", "realeza", "realeza"]; // por fase (na evolução)
function catImageKey(energy, stageIndex) {
  if (energy < 15) return "brava";
  if (energy < 40) return "triste";
  if (stageIndex >= 3) return "realeza";
  if (energy < 70) return "sono";
  return "feliz";
}

const SKIN_TONES = ["#f6d2b3", "#eebd96", "#d39b6e", "#a9714a", "#7a4f30", "#5a3825"];
const HAIR_COLORS = ["#2b2118", "#5a3b22", "#a8662d", "#d6a64a", "#bcbcbc", "#e7e1d6", "#c0392b", "#3a6ea5"];
const HAIRS = [
  { id: "curto", label: "Curto", lvl: 1 },
  { id: "longo", label: "Longo", lvl: 1 },
  { id: "careca", label: "Careca", lvl: 1 },
  { id: "cacheado", label: "Cacheado", lvl: 3 },
  { id: "moicano", label: "Moicano", lvl: 6 },
];
const OUTFITS = [
  { id: "camiseta", label: "Camiseta", lvl: 1, color: "#5aa9e6" },
  { id: "tunica", label: "Túnica", lvl: 2, color: "#7ec850" },
  { id: "armadura", label: "Armadura", lvl: 4, color: "#9aa3b2" },
  { id: "capa", label: "Capa heroica", lvl: 8, color: "#9b59b6" },
];
const ACCESSORIES = [
  { id: "nenhum", label: "Nenhum", lvl: 1 },
  { id: "oculos", label: "Óculos", lvl: 2 },
  { id: "chapeu", label: "Chapéu", lvl: 5 },
  { id: "coroa", label: "Coroa", lvl: 10 },
];

function petEars(species, color) {
  if (species === "cachorro") return (<>
    <path d="M22 38 Q9 41 14 64 Q24 66 31 50 Z" fill={color} stroke="#00000022" strokeWidth="1" />
    <path d="M78 38 Q91 41 86 64 Q76 66 69 50 Z" fill={color} stroke="#00000022" strokeWidth="1" />
  </>);
  if (species === "coelho") return (<>
    <ellipse cx="37" cy="20" rx="7" ry="20" fill={color} stroke="#00000022" strokeWidth="1" />
    <ellipse cx="63" cy="20" rx="7" ry="20" fill={color} stroke="#00000022" strokeWidth="1" />
    <ellipse cx="37" cy="22" rx="3" ry="13" fill="#f7c6d9" />
    <ellipse cx="63" cy="22" rx="3" ry="13" fill="#f7c6d9" />
  </>);
  if (species === "urso") return (<>
    <circle cx="26" cy="30" r="11" fill={color} stroke="#00000022" strokeWidth="1" />
    <circle cx="74" cy="30" r="11" fill={color} stroke="#00000022" strokeWidth="1" />
  </>);
  // gato
  return (<>
    <path d="M20 42 L26 12 L46 34 Z" fill={color} stroke="#00000022" strokeWidth="1" />
    <path d="M80 42 L74 12 L54 34 Z" fill={color} stroke="#00000022" strokeWidth="1" />
    <path d="M27 38 L30 21 L40 33 Z" fill="#f7c6d9" />
    <path d="M73 38 L70 21 L60 33 Z" fill="#f7c6d9" />
  </>);
}

function PetAvatar({ size = 120, species = "gato", color = "#ffffff", sad = false, stageIndex = 0, idle = true, hat = null, glasses = null }) {
  const sleepy = stageIndex === 0 && !sad;
  const crown = stageIndex >= 3;
  const sparkles = stageIndex >= 4;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{ animation: idle && !sad ? "float 3s ease-in-out infinite" : "none", overflow: "visible" }}>
      {sparkles && [[10, 16], [88, 22], [82, 72], [14, 74]].map(([x, y], i) => (
        <path key={i} style={{ animation: "wiggle 1.6s ease-in-out infinite" }}
          d={`M${x} ${y - 4} L${x + 1.4} ${y - 1.4} L${x + 4} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 4} L${x - 1.4} ${y + 1.4} L${x - 4} ${y} L${x - 1.4} ${y - 1.4} Z`}
          fill={C.gold} />
      ))}
      {petEars(species, color)}
      <ellipse cx="50" cy="60" rx="34" ry="30" fill={color} stroke="#00000022" strokeWidth="1.5" />
      {crown && <path d="M34 30 L40 20 L46 28 L50 16 L54 28 L60 20 L66 30 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="1.2" />}
      <ellipse cx="27" cy="67" rx="6" ry="4" fill="#ff7aa820" />
      <ellipse cx="73" cy="67" rx="6" ry="4" fill="#ff7aa820" />
      {sleepy ? (
        <>
          <path d="M30 57 Q38 63 46 57" fill="none" stroke="#3a4a66" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M54 57 Q62 63 70 57" fill="none" stroke="#3a4a66" strokeWidth="2.5" strokeLinecap="round" />
          <text x="72" y="38" fontSize="12" fill="#5aa9e6">z</text>
        </>
      ) : (
        <>
          {sad && <>
            <path d="M30 47 Q38 49 44 52" stroke="#3a4a66" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M70 47 Q62 49 56 52" stroke="#3a4a66" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>}
          <circle cx="38" cy="58" r="8" fill="#ffffffcc" />
          <circle cx="62" cy="58" r="8" fill="#ffffffcc" />
          <circle cx="38" cy="58" r="6" fill="#3a8fd8" />
          <circle cx="62" cy="58" r="6" fill="#3a8fd8" />
          <circle cx="38" cy="58" r="3" fill="#16263b" />
          <circle cx="62" cy="58" r="3" fill="#16263b" />
          <circle cx="40" cy="56" r="1.6" fill="#fff" />
          <circle cx="64" cy="56" r="1.6" fill="#fff" />
          {sad && <path d="M35 65 Q33 71 37 73 Q41 71 39 65 Z" fill="#7ec8ff" />}
        </>
      )}
      <path d="M47 67 L53 67 L50 71 Z" fill="#f08fb0" />
      {sad ? (
        <path d="M42 80 Q50 74 58 80" fill="none" stroke="#c9a9a9" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M50 71 Q46 78 41 76 M50 71 Q54 78 59 76" fill="none" stroke="#c9a9a9" strokeWidth="2" strokeLinecap="round" />
      )}
      {species === "gato" && (
        <g stroke="#9aa0ab" strokeWidth="1.4" strokeLinecap="round">
          <line x1="13" y1="61" x2="30" y2="63" /><line x1="13" y1="68" x2="30" y2="68" />
          <line x1="87" y1="61" x2="70" y2="63" /><line x1="87" y1="68" x2="70" y2="68" />
        </g>
      )}
      {glasses && <text x="50" y="63" fontSize="22" textAnchor="middle">{glasses}</text>}
      {hat && <text x="50" y="25" fontSize="30" textAnchor="middle">{hat}</text>}
    </svg>
  );
}

function PetDisplay({ data, energy = 100, stageIndex = 0, size = 150, imgKeyOverride = null }) {
  const pet = data.pet || DEFAULT_PET;
  const hat = cosmeticEmoji(data, "petHat");
  const glasses = cosmeticEmoji(data, "petGlasses");
  if (IMG_SPECIES.includes(pet.species)) {
    const key = imgKeyOverride || catImageKey(energy, stageIndex);
    return (
      <div style={{ position: "relative", width: size, height: size }}>
        <img src={CAT_IMG[key]} alt={pet.name}
          style={{ width: size, height: size, objectFit: "contain", animation: energy >= 40 ? "float 3s ease-in-out infinite" : "none" }} />
        {glasses && <span style={{ position: "absolute", top: size * 0.4, left: "50%", transform: "translateX(-50%)", fontSize: size * 0.16 }}>{glasses}</span>}
        {hat && <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", fontSize: size * 0.26 }}>{hat}</span>}
      </div>
    );
  }
  return <PetAvatar size={size} species={pet.species} color={pet.color} sad={energy < 40} stageIndex={stageIndex} hat={hat} glasses={glasses} />;
}

function hairEl(hair, color) {
  if (hair === "curto") return <path d="M28 44 Q30 23 50 23 Q70 23 72 44 Q66 33 50 33 Q34 33 28 44 Z" fill={color} />;
  if (hair === "longo") return <><path d="M25 64 Q23 29 50 23 Q77 29 75 64 L69 64 Q72 36 50 34 Q28 36 31 64 Z" fill={color} /><path d="M28 44 Q34 29 50 29 Q66 29 72 44 Q66 33 50 33 Q34 33 28 44 Z" fill={color} /></>;
  if (hair === "cacheado") return <g fill={color}>{[[34, 30], [42, 25], [50, 23], [58, 25], [66, 30], [30, 40], [70, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" />)}</g>;
  if (hair === "moicano") return <path d="M46 21 Q50 6 54 21 L54 40 L46 40 Z" fill={color} />;
  return null; // careca
}

function AvatarFig({ cfg, level = 1, size = 150, hat = null, aura = null }) {
  const skin = cfg?.skin || DEFAULT_AVATAR.skin;
  const hair = cfg?.hair || "curto";
  const hairColor = cfg?.hairColor || "#2b2118";
  const outfit = OUTFITS.find((o) => o.id === cfg?.outfit) || OUTFITS[0];
  const acc = cfg?.accessory || "nenhum";
  const happy = level >= 5;
  const auraRing = level >= 10;
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={{ overflow: "visible" }}>
      {aura && <text x="50" y="62" fontSize="64" textAnchor="middle" opacity="0.22">{aura}</text>}
      {auraRing && <circle cx="50" cy="46" r="42" fill="none" stroke={C.gold} strokeWidth="2" opacity="0.5" style={{ animation: "wiggle 3s ease-in-out infinite" }} />}
      {cfg?.outfit === "capa" && <path d="M30 72 Q50 66 70 72 L80 118 Q50 112 20 118 Z" fill="#7d3ca6" />}
      <path d="M26 118 Q26 80 50 78 Q74 80 74 118 Z" fill={outfit.color} stroke="#00000022" strokeWidth="1" />
      {outfit.id === "armadura" && (<>
        <line x1="50" y1="80" x2="50" y2="118" stroke="#00000022" strokeWidth="2" />
        <path d="M40 88 Q50 94 60 88" stroke="#ffffff66" strokeWidth="2" fill="none" />
      </>)}
      <rect x="44" y="63" width="12" height="15" rx="4" fill={skin} />
      <circle cx="50" cy="46" r="22" fill={skin} stroke="#00000022" strokeWidth="1" />
      <circle cx="28" cy="48" r="4" fill={skin} /><circle cx="72" cy="48" r="4" fill={skin} />
      {hairEl(hair, hairColor)}
      <circle cx="42" cy="46" r="2.5" fill="#26201a" /><circle cx="58" cy="46" r="2.5" fill="#26201a" />
      <path d={happy ? "M40 54 Q50 64 60 54" : "M43 55 Q50 60 57 55"} fill="none" stroke="#9a6a5a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="53" r="3" fill="#ff5a5a22" /><circle cx="64" cy="53" r="3" fill="#ff5a5a22" />
      {acc === "oculos" && <g stroke="#26201a" strokeWidth="2" fill="none"><circle cx="42" cy="46" r="6" /><circle cx="58" cy="46" r="6" /><line x1="48" y1="46" x2="52" y2="46" /></g>}
      {acc === "chapeu" && <g><rect x="30" y="25" width="40" height="6" rx="3" fill="#5a3b22" /><rect x="38" y="12" width="24" height="16" rx="4" fill="#7a4f30" /></g>}
      {acc === "coroa" && <path d="M34 26 L40 13 L46 23 L50 9 L54 23 L60 13 L66 26 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="1" />}
      {hat && <text x="50" y="24" fontSize="26" textAnchor="middle">{hat}</text>}
    </svg>
  );
}

