// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { getDeferred, subscribe as subscribeInstall, doInstall, isStandalone, isIOS } from "@/lib/pwa";
import { pushSupported, currentSubscription, enablePush, disablePush, sendTestLocal } from "@/lib/push";
import RoutineDefense from "./RoutineDefense";
import { loadSave, persistSave } from "@/lib/save";
import {
  Sword, Store, Heart, BarChart3, Crown, Flame,
  Plus, Minus, Trash2, X, Target, Zap, Volume2, VolumeX, Coins, Check,
  Trophy, Skull, Droplet, Pill, Sun, Moon, Utensils, LogOut, Pencil,
  Gem, PawPrint, Smile, Mail, Bell,
} from "lucide-react";

/* ============================================================
   RPG DA VIDA — Habit Tracker gamificado para mentes com TDAH
   Single-file React app. Salvamento via window.storage (persiste
   entre sessões). Estrutura de dados desenhada para migrar fácil
   para Supabase: cada "tabela" é uma chave do objeto `data`.
   ============================================================ */

/* ---------- Tema / cores (inline styles: o runtime não compila
   classes Tailwind arbitrárias, então cor fica em style) ---------- */
const C = {
  night: "#1b1430",
  night2: "#241a40",
  parch: "#f4e6c5",
  parch2: "#ead2a0",
  ink: "#3a2a18",
  inkSoft: "#6b5436",
  gold: "#e8b339",
  goldDeep: "#b3801c",
  xp: "#5bbd6a",
  xpDeep: "#3c9a4c",
  ember: "#ff7a3d",
  rose: "#e879a6",
  sky: "#5aa9e6",
  panelLine: "rgba(58,42,24,0.18)",
};

const CATS = {
  pet: { label: "Mona", emoji: "🐾", color: C.rose },
  casa: { label: "Casa", emoji: "🏠", color: C.sky },
  pessoal: { label: "Pessoal", emoji: "🎒", color: C.gold },
  saude: { label: "Saúde", emoji: "💙", color: "#34b3a0" },
};

/* ---------- Tarefas iniciais ---------- */
const BASE_TASKS = [
  { id: "t_comida", key: "comida_mona", name: "Colocar comida para a Mona", desc: "Encha o potinho", xp: 10, category: "pet", need: "hunger" },
  { id: "t_agua", key: "agua_mona", name: "Tem água para a Mona", desc: "Água fresca no pote", xp: 5, category: "pet", need: "thirst" },
  { id: "t_areia", key: "areia", name: "Areia limpa", desc: "Caixa de areia em ordem", xp: 10, category: "pet", need: "hygiene" },
  { id: "t_brincar", key: "brincar_mona", name: "Brincar com a Mona", desc: "Um tempinho de carinho e brincadeira", xp: 10, category: "pet", need: "fun" },
  { id: "t_guarda", key: "guarda_roupa", name: "Mona fora do guarda-roupa", desc: "Confira antes de fechar", xp: 10, category: "pet" },
  { id: "t_torneira", key: "torneiras", name: "Torneiras fechadas", desc: "Cozinha e banheiro", xp: 5, category: "casa" },
  { id: "t_filtro", key: "filtro", name: "Filtro fechado", desc: "Sem desperdício", xp: 5, category: "casa" },
  { id: "t_luzes", key: "luzes", name: "Luzes desligadas", desc: "Economia ligada", xp: 5, category: "casa" },
  { id: "t_janela", key: "janela", name: "Janela fechada", desc: "Casa segura", xp: 5, category: "casa" },
  { id: "t_geladeira", key: "geladeira", name: "Geladeira fechada", desc: "Porta bem encostada", xp: 5, category: "casa" },
  { id: "t_lixo", key: "lixo", name: "Lixo para fora", desc: "Só ter, qui e sáb", xp: 15, category: "casa", days: [2, 4, 6] },
  { id: "t_chave", key: "chave", name: "Pegou a chave", desc: "Antes de sair", xp: 5, category: "pessoal" },
  { id: "t_carteira", key: "carteira", name: "Pegou a carteira", desc: "Antes de sair", xp: 5, category: "pessoal" },
  { id: "t_celular", key: "celular", name: "Pegou o celular", desc: "Antes de sair", xp: 5, category: "pessoal" },
];

/* ---------- Saúde ---------- */
// Os remédios começam vazios (cada um monta o seu, na aba Saúde).
const MEAL_DEFAULTS = [
  { id: "meal_cafe", name: "Café da manhã", xp: 8 },
  { id: "meal_almoco", name: "Almoço", xp: 8 },
  { id: "meal_lanche", name: "Lanche da tarde", xp: 6 },
  { id: "meal_janta", name: "Janta", xp: 8 },
  { id: "meal_ceia", name: "Ceia", xp: 5 },
];
const CUP_ML = 250;            // 1 copo = 250 ml
const WATER_XP = 2;            // XP por copo (só até a meta)
const WATER_GOAL_L_DEFAULT = 3; // meta padrão em litros (configurável)
const GLUCOSE_TAGS = [
  { id: "jejum", label: "Em jejum" },
  { id: "antes", label: "Antes de comer" },
  { id: "depois", label: "Depois de comer" },
  { id: "dormir", label: "Antes de dormir" },
  { id: "outro", label: "Outro" },
];
const GLUCOSE_INTERVAL_DEFAULT = 3; // horas
const cupsForLiters = (l) => Math.round((l * 1000) / CUP_ML);

/* ---------- Recompensas padrão ---------- */
const DEFAULT_REWARDS = [
  { id: "r1", name: "Assistir um episódio", emoji: "📺", cost: 100 },
  { id: "r2", name: "Comprar um chocolate", emoji: "🍫", cost: 150 },
  { id: "r3", name: "Jogar videogame", emoji: "🎮", cost: 200 },
  { id: "r4", name: "Pedir um hambúrguer", emoji: "🍔", cost: 500 },
  { id: "r5", name: "Comprar algo desejado", emoji: "🎁", cost: 1500 },
];

/* ---------- Conquistas ---------- */
const ACHIEVEMENTS = [
  { id: "first_task", name: "Primeira Missão", emoji: "⭐", desc: "Conclua sua primeira tarefa", check: (s) => s.tasksCompleted >= 1 },
  { id: "first_level", name: "Primeiro Nível", emoji: "🌟", desc: "Alcance o nível 2", check: (s) => s.level >= 2 },
  { id: "streak7", name: "Chama de 7 Dias", emoji: "🔥", desc: "Mantenha 7 dias seguidos", check: (s) => s.longestStreak >= 7 },
  { id: "streak30", name: "Chama Eterna", emoji: "🏆", desc: "Mantenha 30 dias seguidos", check: (s) => s.longestStreak >= 30 },
  { id: "tasks100", name: "Centurião", emoji: "💯", desc: "Conclua 100 tarefas", check: (s) => s.tasksCompleted >= 100 },
  { id: "xp1000", name: "Mil de XP", emoji: "✨", desc: "Acumule 1000 de XP", check: (s) => s.xpTotal >= 1000 },
  { id: "mona_master", name: "Mestre da Mona", emoji: "🐱", desc: "Cuide da Mona 20 vezes", check: (s) => (s.catCounts.pet || 0) >= 20 },
  { id: "fridge_guard", name: "Guardião da Geladeira", emoji: "🧊", desc: "Feche a geladeira 15 vezes", check: (s) => (s.taskCounts.geladeira || 0) >= 15 },
  { id: "med_supreme", name: "Remédios Supremo", emoji: "💊", desc: "Remédios completos por 30 dias", check: (s) => (s.medDaysTotal || 0) >= 30 },
];

/* ---------- Chefes ---------- */
const BOSSES = [
  { id: "boss_week", name: "Chefe da Semana", emoji: "🐉", desc: "Remédios completos 7 dias seguidos", goal: 7, metric: "medStreak", rewardXp: 500, rewardGold: 200, rewardGems: 30, loot: "Poção da Constância" },
  { id: "boss_month", name: "Chefe do Mês", emoji: "👹", desc: "Conclua 100 tarefas no total", goal: 100, metric: "tasksCompleted", rewardXp: 1000, rewardGold: 1000, rewardGems: 100, loot: "Coroa Lendária 👑" },
];

/* ---------- Gemas (moeda de cosméticos) ---------- */
const GEMS_PER_LEVEL = 5;     // ao subir de nível
const GEMS_DAY_BONUS = 10;    // ao fechar todas as missões do dia
const GAME_GEM_DAILY_CAP = 10; // teto de gemas/dia vindas do mini-game

/* ---------- Energia do Pet (estilo Pou) ---------- */
const ENERGY_DECAY_PER_HOUR = 1.4;   // ~33/dia (ritmo médio: ~3 dias para esvaziar)
const ENERGY_RECOVER_TASK = 8;       // por missão concluída
const ENERGY_RECOVER_WATER = 2;      // por copo de água
function currentEnergy(d) {
  const now = Date.now();
  const ts = d.petEnergyTs || now;
  const hrs = Math.max(0, (now - ts) / 3600000);
  const base = typeof d.petEnergy === "number" ? d.petEnergy : 100;
  return Math.max(0, Math.min(100, base - ENERGY_DECAY_PER_HOUR * hrs));
}
function settleEnergy(d) {
  d.petEnergy = currentEnergy(d);
  d.petEnergyTs = Date.now();
}
function bumpEnergy(d, amt) {
  settleEnergy(d);
  d.petEnergy = Math.max(0, Math.min(100, d.petEnergy + amt));
}
function energyMood(e) {
  if (e >= 70) return { label: "Cheio de energia", color: C.xp };
  if (e >= 40) return { label: "De boa", color: C.gold };
  if (e >= 15) return { label: "Com fome…", color: C.ember };
  return { label: "Carente de carinho", color: "#c0392b" };
}

/* ---------- Tamagotchi (espelho do pet real) ---------- */
const TAMA_DECAY = { hunger: 2.6, thirst: 3.0, hygiene: 2.2, fun: 2.4 }; // pontos por hora
const TAMA_NEED_LABEL = { hunger: "Fome", thirst: "Água", hygiene: "Higiene", fun: "Felicidade" };
function cl100(v) { return Math.max(0, Math.min(100, v)); }
function freshTama() {
  const now = Date.now();
  return { startedAt: new Date().toISOString(), ts: now, hunger: 80, thirst: 80, hygiene: 90, fun: 80, sick: false, type: null, stage: 0, bond: 0 };
}
function decayTama(t) {
  const now = Date.now();
  const hrs = Math.max(0, (now - (t.ts || now)) / 3600000);
  return {
    ...t,
    hunger: cl100(t.hunger - TAMA_DECAY.hunger * hrs),
    thirst: cl100(t.thirst - TAMA_DECAY.thirst * hrs),
    hygiene: cl100(t.hygiene - TAMA_DECAY.hygiene * hrs),
    fun: cl100(t.fun - TAMA_DECAY.fun * hrs),
    ts: now,
  };
}
function currentTama(d) {
  return decayTama(d.tama || freshTama());
}
// versão que atualiza o estado salvo (usar dentro de setData)
function settleTama(d) {
  const t = decayTama(d.tama || freshTama());
  if (t.hunger <= 3 || t.hygiene <= 3) t.sick = true;     // fica doente se muito negligenciada
  d.tama = t;
  return t;
}
function tamaAvg(t) { return Math.round((t.hunger + t.thirst + t.hygiene + t.fun) / 4); }
function tamaImageKey(t, stageIndex) {
  if (t.sick) return "triste";
  const avg = tamaAvg(t);
  const low = Math.min(t.hunger, t.thirst, t.hygiene, t.fun);
  if (low < 12 || avg < 20) return "brava";
  if (avg < 45) return "triste";
  if (stageIndex >= 3 && avg >= 70) return "realeza";
  if (avg < 70) return "sono";
  return "feliz";
}
function tamaMoodLabel(t) {
  if (t.sick) return { label: "Doente — dê remédio 💊", color: "#c0392b" };
  const avg = tamaAvg(t);
  if (avg >= 75) return { label: "Radiante e bem cuidado", color: C.xp };
  if (avg >= 45) return { label: "De boa", color: C.gold };
  if (avg >= 20) return { label: "Precisando de você", color: C.ember };
  return { label: "Muito carente", color: "#c0392b" };
}

/* ---------- Monstrinho digital (estilo Digimon) ---------- */
const MON_TYPES = [
  { id: "fogo", label: "Fogo", emoji: "🔥", color: "#e8843a", vibe: "ousado e quentão" },
  { id: "agua", label: "Água", emoji: "💧", color: "#46b6e8", vibe: "calmo e fluido" },
  { id: "planta", label: "Planta", emoji: "🌿", color: "#6fcf5e", vibe: "tranquilo e teimoso" },
];
const MON_STAGES = ["Ovo Digital", "Bebê", "Treino", "Amador"];
const MON_EVO = [25, 70, 140]; // vínculo p/ evoluir entre os estágios
const MON_MAX_STAGE = 3;
function monSrc(type, stage) { return `/mon/${type}_${stage}.png`; }
function gainBond(d, amt) {
  const t = d.tama;
  if (!t || !t.type) return;
  t.bond = (t.bond || 0) + amt;
  while (t.stage < MON_MAX_STAGE && t.bond >= MON_EVO[t.stage]) {
    t.bond -= MON_EVO[t.stage];
    t.stage += 1;
    t.justEvolved = t.stage;
  }
}

function MonSprite({ type, stage, size = 150, alive = true }) {
  return (
    <img src={monSrc(type, stage)} alt="monstrinho"
      style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "contain", animation: alive ? "monbob 0.9s steps(1) infinite" : "none" }} />
  );
}

/* ---------- Mapa da jornada ---------- */
const JOURNEY = [
  { name: "Vila do Caos", xp: 0, emoji: "🏚️" },
  { name: "Aprendiz da Organização", xp: 300, emoji: "🧹" },
  { name: "Guardião da Casa", xp: 900, emoji: "🛡️" },
  { name: "Mestre da Rotina", xp: 2000, emoji: "⚔️" },
  { name: "Lenda Doméstica", xp: 4000, emoji: "🏰" },
];

/* ---------- Pet (genérico) ---------- */
const PET_STAGES = [
  { name: "Filhote Sonolento", xp: 0 },
  { name: "Explorador", xp: 200 },
  { name: "Caçador", xp: 600 },
  { name: "Realeza da Casa", xp: 1500 },
  { name: "Companheiro Lendário", xp: 3500 },
];
const PET_SPECIES = [
  { id: "gato", label: "Gato", emoji: "🐱" },
  { id: "cachorro", label: "Cão", emoji: "🐶" },
  { id: "coelho", label: "Coelho", emoji: "🐰" },
  { id: "urso", label: "Urso", emoji: "🐻" },
];
const PET_COLORS = ["#ffffff", "#f4c542", "#e2a16f", "#b97a56", "#8a8f99", "#3a3a44", "#f6a5c0", "#9ad0c2"];
const DEFAULT_PET = { name: "Mona", species: "gato", color: "#ffffff" };

/* ---------- Ilustrações (imagens reais) ---------- */
const IMG_SPECIES = ["gato"]; // espécies com ilustração pronta (sem cor/SVG)
const CAT_IMG = {
  feliz: "/pets/feliz.png",
  realeza: "/pets/realeza.png",
  sono: "/pets/sono.png",
  triste: "/pets/triste.png",
  brava: "/pets/brava.png",
};
const CAT_STAGE_IMG = ["sono", "feliz", "feliz", "realeza", "realeza"]; // por fase (na evolução)
const AVATAR_IMG = { normal: "/avatar/normal.png", supremo: "/avatar/supremo.png" };
const AVATAR_SUPREMO_LEVEL = 10;
// Escolhe a imagem do gato pela energia (estilo Pou) e fase
function catImageKey(energy, stageIndex) {
  if (energy < 15) return "brava";
  if (energy < 40) return "triste";
  if (stageIndex >= 3) return "realeza";
  if (energy < 70) return "sono";
  return "feliz";
}

/* ---------- Avatar (camadas + desbloqueio por nível) ---------- */
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
const DEFAULT_AVATAR = { skin: "#eebd96", hair: "curto", hairColor: "#2b2118", outfit: "camiseta", accessory: "nenhum" };

/* ---------- Cosméticos (comprados com gemas) ---------- */
const COSMETICS = [
  // Pet
  { id: "pet_laco", name: "Laço", emoji: "🎀", target: "pet", slot: "petHat", cost: 30 },
  { id: "pet_flor", name: "Florzinha", emoji: "🌸", target: "pet", slot: "petHat", cost: 30 },
  { id: "pet_cartola", name: "Cartola", emoji: "🎩", target: "pet", slot: "petHat", cost: 45 },
  { id: "pet_mago", name: "Chapéu de Mago", emoji: "🧙", target: "pet", slot: "petHat", cost: 70 },
  { id: "pet_coroa", name: "Coroa Real", emoji: "👑", target: "pet", slot: "petHat", cost: 150, bonusGems: 1 },
  { id: "pet_oculos", name: "Óculos de Sol", emoji: "🕶️", target: "pet", slot: "petGlasses", cost: 40 },
  // Avatar
  { id: "av_cartola", name: "Cartola", emoji: "🎩", target: "avatar", slot: "avatarHat", cost: 45 },
  { id: "av_capacete", name: "Capacete", emoji: "⛑️", target: "avatar", slot: "avatarHat", cost: 50 },
  { id: "av_mago", name: "Chapéu de Mago", emoji: "🧙", target: "avatar", slot: "avatarHat", cost: 70 },
  { id: "av_coroa", name: "Coroa Real", emoji: "👑", target: "avatar", slot: "avatarHat", cost: 160, bonusGems: 1 },
  { id: "av_aureola", name: "Auréola", emoji: "😇", target: "avatar", slot: "avatarAura", cost: 110 },
  { id: "av_fenix", name: "Aura de Fênix", emoji: "🔥", target: "avatar", slot: "avatarAura", cost: 140, bonusGems: 1 },
];
const DEFAULT_COSMETICS = { owned: [], equipped: {} };
function equippedGemBonus(d) {
  const eq = (d.cosmetics && d.cosmetics.equipped) || {};
  let sum = 0;
  for (const slot in eq) {
    const item = COSMETICS.find((c) => c.id === eq[slot]);
    if (item && item.bonusGems) sum += item.bonusGems;
  }
  return sum;
}
function cosmeticEmoji(d, slot) {
  const eq = (d.cosmetics && d.cosmetics.equipped) || {};
  const item = COSMETICS.find((c) => c.id === eq[slot]);
  return item ? item.emoji : null;
}

/* ---------- Mensagens divertidas ao concluir ---------- */
const FUN_MSGS = {
  pet: ["Seu bichinho está orgulhoso 🐾", "Carinho de aprovação ativado", "A casa agradece o cuidado"],
  casa: ["Você derrotou o Monstro da Pia Aberta", "Geladeira protegida com sucesso", "O Caos recuou um passo"],
  pessoal: ["Herói preparado para a jornada", "Mente e corpo em sincronia", "Mais um passo na disciplina"],
  saude: ["Glicemia sob controle, herói 💙", "Seu corpo agradece o cuidado", "Mais um passo pela sua saúde"],
};

/* ---------- Curva de XP ---------- */
const xpToNext = (level) => Math.floor(100 + (level - 1) * 60 + Math.pow(level - 1, 2) * 10);
function levelFromXp(xpTotal) {
  let level = 1, rem = xpTotal;
  while (rem >= xpToNext(level)) { rem -= xpToNext(level); level++; }
  return { level, xpInLevel: rem, xpForNext: xpToNext(level) };
}

/* ---------- Datas ---------- */
const dayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
const isActiveToday = (t) => !t.days || t.days.includes(new Date().getDay());
function markActive(d) {
  const today = dayKey();
  if (!d.daysActive.includes(today)) d.daysActive = [...d.daysActive, today];
  if (d.lastActiveDate !== today) {
    d.currentStreak = d.lastActiveDate === yesterdayKey() ? d.currentStreak + 1 : 1;
    d.lastActiveDate = today;
    d.longestStreak = Math.max(d.longestStreak, d.currentStreak);
    d.streakBrokenNote = false;
    // bônus diário de gemas dos cosméticos equipados
    const bonus = equippedGemBonus(d);
    if (bonus) d.gems = (d.gems || 0) + bonus;
  }
}

/* ---------- Estado inicial ---------- */
const DEFAULT_DATA = {
  v: 2,
  playerName: "Herói",
  xpTotal: 0,
  gold: 0,
  doneToday: [],
  scoredToday: { date: dayKey(), ids: [] }, // anti-farm: o que já pontuou hoje
  lastResetDate: dayKey(),
  tasks: null,   // semeado em freshData()/migração
  meds: [],      // remédios do usuário (manhã/noite)
  meals: null,   // refeições nomeadas (semeado)
  rewards: DEFAULT_REWARDS,
  purchases: [],
  tasksCompleted: 0,
  catCounts: { pet: 0, casa: 0, pessoal: 0, saude: 0 },
  taskCounts: {},
  gems: 0,
  pet: { ...DEFAULT_PET },
  avatar: { ...DEFAULT_AVATAR },
  cosmetics: { owned: [], equipped: {} },
  petEnergy: 100,
  petEnergyTs: Date.now(),
  tama: freshTama(),
  hardMode: false,
  hardPenaltyNote: null,
  gameBest: 0,
  gameGemsToday: null,
  dayBonusDate: null,
  water: { date: dayKey(), count: 0 },          // count = copos de 250 ml
  waterScored: { date: dayKey(), cups: 0 },      // anti-farm da água
  waterGoalL: WATER_GOAL_L_DEFAULT,
  glucose: [],
  glucoseIntervalH: GLUCOSE_INTERVAL_DEFAULT,
  daysActive: [],
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  medStreak: 0,
  medDaysTotal: 0,
  lastMedDate: null,
  achievements: [],
  bossesDefeated: [],
  soundOn: true,
  streakBrokenNote: false,
};

/** Estado novo com missões e refeições já semeadas. */
function freshData() {
  return {
    ...DEFAULT_DATA,
    scoredToday: { date: dayKey(), ids: [] },
    water: { date: dayKey(), count: 0 },
    waterScored: { date: dayKey(), cups: 0 },
    tasks: BASE_TASKS.map((t) => ({ ...t })),
    meds: [],
    meals: MEAL_DEFAULTS.map((m) => ({ ...m })),
    pet: { ...DEFAULT_PET },
    avatar: { ...DEFAULT_AVATAR },
    cosmetics: { owned: [], equipped: {} },
    gems: 0,
    petEnergy: 100,
    petEnergyTs: Date.now(),
    tama: freshTama(),
  };
}

const SAVE_KEY = "rpg_da_vida_save_v1";

/* ---------- Som (Web Audio, sem arquivos) ---------- */
function useSound() {
  const ctxRef = useRef(null);
  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    return ctxRef.current;
  };
  const tone = (freq, t0, dur, type = "sine", gain = 0.08) => {
    const ctx = ensure(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime + t0;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now); o.stop(now + dur + 0.02);
  };
  const ding = () => { tone(740, 0, 0.18, "triangle"); tone(988, 0.06, 0.2, "triangle"); };
  const levelUp = () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, "square", 0.07)); };
  const coin = () => { tone(880, 0, 0.08, "square", 0.06); tone(1320, 0.07, 0.12, "square", 0.06); };
  const boss = () => { [392, 392, 311, 466].forEach((f, i) => tone(f, i * 0.12, 0.35, "sawtooth", 0.06)); };
  return { ding, levelUp, coin, boss };
}

/* ============================================================ */
export default function RpgDaVida({ user, onSignOut }) {
  const supabase = getSupabase();
  const userId = user.id;
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("aventura");
  const [pops, setPops] = useState([]);        // popups flutuantes
  const [particles, setParticles] = useState([]);
  const [levelUpBanner, setLevelUpBanner] = useState(null);
  const [bossBanner, setBossBanner] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [toast, setToast] = useState(null);
  const sound = useSound();
  const saveTimer = useRef(null);

  /* ----- carregar ----- */
  useEffect(() => {
    let alive = true;
    (async () => {
      let loaded = null;
      try {
        loaded = await loadSave(supabase, userId);
      } catch (e) { /* primeira vez ou erro de rede */ }
      let d = { ...freshData(), ...(loaded || {}) };

      // ---- migração de saves antigos (preserva o progresso) ----
      if (loaded) {
        if (loaded.tasks === undefined || loaded.tasks === null) {
          d.tasks = [...BASE_TASKS.map((t) => ({ ...t })), ...((loaded.customTasks) || [])];
        }
        if (loaded.meds === undefined) d.meds = [...((loaded.customMeds) || [])];
        if (loaded.meals === undefined || !Array.isArray(loaded.meals)) {
          d.meals = MEAL_DEFAULTS.map((m) => ({ ...m }));
        }
        if (!d.scoredToday || d.scoredToday.date !== dayKey()) d.scoredToday = { date: dayKey(), ids: [] };
        if (!d.waterScored || d.waterScored.date !== dayKey()) d.waterScored = { date: dayKey(), cups: 0 };
        if (typeof d.waterGoalL !== "number") d.waterGoalL = WATER_GOAL_L_DEFAULT;
        if (!Array.isArray(d.glucose)) d.glucose = [];
        if (typeof d.glucoseIntervalH !== "number") d.glucoseIntervalH = GLUCOSE_INTERVAL_DEFAULT;
        if (!d.water || typeof d.water.count !== "number") d.water = { date: dayKey(), count: 0 };
        if (typeof d.gems !== "number") d.gems = 0;
        if (!d.pet || typeof d.pet !== "object") d.pet = { ...DEFAULT_PET };
        if (!d.avatar || typeof d.avatar !== "object") d.avatar = { ...DEFAULT_AVATAR };
        if (!d.cosmetics || typeof d.cosmetics !== "object") d.cosmetics = { owned: [], equipped: {} };
        if (typeof d.petEnergy !== "number") { d.petEnergy = 100; d.petEnergyTs = Date.now(); }
        if (!d.tama || typeof d.tama !== "object") d.tama = freshTama();
        if (!("type" in d.tama)) { d.tama.type = null; d.tama.stage = 0; d.tama.bond = 0; }
        // marca missões de cuidado com seu "need" e garante a missão de brincar
        if (Array.isArray(d.tasks)) {
          const needByKey = { comida_mona: "hunger", agua_mona: "thirst", areia: "hygiene", brincar_mona: "fun" };
          d.tasks = d.tasks.map((t) => (needByKey[t.key] && !t.need ? { ...t, need: needByKey[t.key] } : t));
          if (!d.tasks.some((t) => t.key === "brincar_mona")) {
            const idx = d.tasks.findIndex((t) => t.key === "areia");
            const brincar = { id: "t_brincar", key: "brincar_mona", name: "Brincar com a Mona", desc: "Um tempinho de carinho e brincadeira", xp: 10, category: "pet", need: "fun" };
            if (idx >= 0) d.tasks.splice(idx + 1, 0, brincar); else d.tasks.push(brincar);
          }
        }
        if (typeof d.hardMode !== "boolean") d.hardMode = false;
        if (typeof d.gameBest !== "number") d.gameBest = 0;
      }
      delete d.customTasks; delete d.customMeds;

      // reset diário
      const today = dayKey();
      if (d.lastResetDate !== today) {
        // Modo Difícil: penaliza missões não feitas no dia que está fechando
        if (d.hardMode && d.lastResetDate) {
          const prevDow = new Date(`${d.lastResetDate}T12:00:00`).getDay();
          const prevActive = (d.tasks || []).filter((t) => !t.days || t.days.includes(prevDow));
          const missed = prevActive.filter((t) => !d.doneToday.includes(t.id));
          const penalty = missed.reduce((s, t) => s + (t.xp || 0), 0);
          if (penalty > 0) {
            d.xpTotal = Math.max(0, d.xpTotal - penalty);
            d.gold = Math.max(0, d.gold - penalty);
            d.hardPenaltyNote = penalty;
          }
        }
        d.doneToday = [];
        d.lastResetDate = today;
        d.water = { date: today, count: 0 };
        d.waterScored = { date: today, cups: 0 };
        d.scoredToday = { date: today, ids: [] };
        // chama da medicação: quebra se pulou um dia
        if (d.lastMedDate && d.lastMedDate !== today && d.lastMedDate !== yesterdayKey()) d.medStreak = 0;
        // streak: marca quebra amigável se o último dia ativo não foi ontem nem hoje
        if (d.lastActiveDate && d.lastActiveDate !== today && d.lastActiveDate !== yesterdayKey() && d.currentStreak > 0) {
          d.currentStreak = 0;
          d.streakBrokenNote = true;
        }
      }
      if (alive) setData(d);
    })();
    return () => { alive = false; };
  }, [userId]);

  /* ----- salvar (debounce) na nuvem ----- */
  useEffect(() => {
    if (!data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await persistSave(supabase, userId, data);
      } catch (e) { /* tenta de novo no próximo save */ }
    }, 500);
  }, [data, userId]);

  if (!data) {
    return (
      <div style={{ background: C.night, color: C.parch, minHeight: "100vh" }}
        className="flex items-center justify-center font-serif text-xl">
        <div className="animate-pulse">⚔️ Carregando a aventura…</div>
      </div>
    );
  }

  /* ---------- derivados ---------- */
  const allTasks = data.tasks || [];
  const { level, xpInLevel, xpForNext } = levelFromXp(data.xpTotal);
  const pct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));
  const playerClass = getPlayerClass(data.catCounts, data.tasksCompleted, level);
  const petStage = stageFor(PET_STAGES, data.xpTotal);
  const journeyStage = stageFor(JOURNEY, data.xpTotal);
  const petEnergy = currentEnergy(data);
  const petSad = petEnergy < 40;
  const tama = currentTama(data);
  const tAvg = tamaAvg(tama);

  const statsSnap = {
    tasksCompleted: data.tasksCompleted, level, xpTotal: data.xpTotal,
    longestStreak: data.longestStreak, catCounts: data.catCounts, taskCounts: data.taskCounts,
  };

  /* ---------- efeitos visuais ---------- */
  const spawnPop = (text, color) => {
    const id = Math.random().toString(36).slice(2);
    setPops((p) => [...p, { id, text, color }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1400);
  };
  const spawnParticles = (color) => {
    const batch = Array.from({ length: 10 }).map(() => {
      const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 70;
      return { id: Math.random().toString(36).slice(2), tx: Math.cos(a) * r, ty: Math.sin(a) * r, color };
    });
    setParticles((p) => [...p, ...batch]);
    setTimeout(() => setParticles((p) => p.filter((x) => !batch.find((b) => b.id === x.id))), 900);
  };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  /* ---------- concluir / desfazer tarefa (anti-farm: pontua 1x/dia) ---------- */
  const toggleTask = (task) => {
    const isDone = data.doneToday.includes(task.id);
    setData((prev) => {
      const d = { ...prev };
      const today = dayKey();
      if (!isDone) {
        d.doneToday = [...d.doneToday, task.id];
        const scored = d.scoredToday && d.scoredToday.date === today ? d.scoredToday.ids : [];
        const already = scored.includes(task.id);
        if (!already) {
          // pontua só na primeira vez do dia
          const prevLevel = levelFromXp(d.xpTotal).level;
          d.xpTotal += task.xp;
          d.gold += task.xp;
          d.scoredToday = { date: today, ids: [...scored, task.id] };
          d.tasksCompleted += 1;
          d.catCounts = { ...d.catCounts, [task.category]: (d.catCounts[task.category] || 0) + 1 };
          if (task.key) d.taskCounts = { ...d.taskCounts, [task.key]: (d.taskCounts[task.key] || 0) + 1 };

          markActive(d);
          bumpEnergy(d, ENERGY_RECOVER_TASK);
          d.hardPenaltyNote = null;

          // Tamagotchi: cuidar da Mona real enche os medidores da Mona virtual
          settleTama(d);
          if (task.need) d.tama[task.need] = 100;
          if (task.category === "pet") d.tama.fun = cl100(d.tama.fun + 12);
          if (d.tama.hunger > 20 && d.tama.thirst > 20 && d.tama.hygiene > 20) d.tama.sick = false;
          // vínculo (evolução por bom cuidado)
          if (task.category === "pet") gainBond(d, 8);
          if (task.need) gainBond(d, 6);

          // remédios do dia completos?
          const medIds = (d.meds || []).map((m) => m.id);
          if (medIds.length && medIds.every((id) => d.doneToday.includes(id))) {
            if (d.lastMedDate !== today) {
              d.medStreak = d.lastMedDate === yesterdayKey() ? d.medStreak + 1 : 1;
              d.lastMedDate = today;
              d.medDaysTotal = (d.medDaysTotal || 0) + 1;
            }
          }

          const newAch = checkAchievements(d, level);
          d.achievements = newAch.list;

          const newLevel = levelFromXp(d.xpTotal).level;
          if (newLevel > prevLevel) {
            d.gems = (d.gems || 0) + GEMS_PER_LEVEL * (newLevel - prevLevel);
            if (d.soundOn) sound.levelUp();
            setLevelUpBanner(newLevel);
            setTimeout(() => setLevelUpBanner(null), 2600);
          } else if (d.soundOn) sound.ding();

          const color = (CATS[task.category] || CATS.pessoal).color;
          spawnPop(`+${task.xp} XP`, color);
          spawnParticles(color);
          const arr = FUN_MSGS[task.category] || FUN_MSGS.pessoal;
          showToast(arr[Math.floor(Math.random() * arr.length)]);
          if (newAch.unlocked.length) {
            const a = ACHIEVEMENTS.find((x) => x.id === newAch.unlocked[0]);
            setTimeout(() => showToast(`Conquista: ${a.emoji} ${a.name}`), 900);
          }

          const bdef = checkBosses(d);
          if (bdef) {
            d.xpTotal += bdef.rewardXp; d.gold += bdef.rewardGold;
            d.gems = (d.gems || 0) + (bdef.rewardGems || 0);
            d.bossesDefeated = [...d.bossesDefeated, bdef.id];
            if (d.soundOn) sound.boss();
            setBossBanner(bdef);
            setTimeout(() => setBossBanner(null), 3200);
          }

          // bônus por fechar todas as missões do dia (1x/dia)
          const todays = (d.tasks || []).filter(isActiveToday);
          if (todays.length && todays.every((t) => d.doneToday.includes(t.id)) && d.dayBonusDate !== today) {
            d.gems = (d.gems || 0) + GEMS_DAY_BONUS;
            d.dayBonusDate = today;
            setTimeout(() => showToast(`Dia completo! +${GEMS_DAY_BONUS} 💎`), 1200);
          }
        }
        // se já pontuou hoje, só marca (sem XP, sem efeitos)
      } else {
        // desfazer: apenas desmarca. NÃO devolve XP nem permite ganhar de novo.
        d.doneToday = d.doneToday.filter((id) => id !== task.id);
      }
      return d;
    });
  };

  /* ---------- comprar recompensa ---------- */
  const buyReward = (rw) => {
    if (data.gold < rw.cost) { showToast("Ouro insuficiente, herói!"); return; }
    setData((prev) => ({
      ...prev,
      gold: prev.gold - rw.cost,
      purchases: [{ id: Math.random().toString(36).slice(2), name: rw.name, emoji: rw.emoji, cost: rw.cost, date: new Date().toISOString() }, ...prev.purchases].slice(0, 50),
    }));
    if (data.soundOn) sound.coin();
    showToast(`${rw.emoji} ${rw.name} resgatado!`);
  };

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));

  const buyCosmetic = (item) => {
    const cos = data.cosmetics || { owned: [], equipped: {} };
    if (cos.owned.includes(item.id)) return;
    if ((data.gems || 0) < item.cost) { showToast("Gemas insuficientes 💎"); return; }
    setData((prev) => {
      const c = prev.cosmetics || { owned: [], equipped: {} };
      return { ...prev, gems: (prev.gems || 0) - item.cost, cosmetics: { owned: [...c.owned, item.id], equipped: { ...c.equipped, [item.slot]: item.id } } };
    });
    if (data.soundOn) sound.coin();
    showToast(`${item.emoji} ${item.name} comprado!`);
  };

  // recompensa do mini-game: gemas = ondas limpas, com teto diário
  const endGame = (wavesCleared) => {
    const today = dayKey();
    const g = (data.gameGemsToday && data.gameGemsToday.date === today) ? data.gameGemsToday : { date: today, earned: 0 };
    const remaining = Math.max(0, GAME_GEM_DAILY_CAP - g.earned);
    const award = Math.max(0, Math.min(wavesCleared, remaining));
    update({
      gems: (data.gems || 0) + award,
      gameGemsToday: { date: today, earned: g.earned + award },
      gameBest: Math.max(data.gameBest || 0, wavesCleared),
    });
    if (award > 0 && data.soundOn) sound.coin();
    return award;
  };

  // interações livres do Tamagotchi (não dão XP/ouro; só cuidam do bichinho)
  const tamaCare = (action) => setData((prev) => {
    const d = { ...prev };
    settleTama(d);
    const t = d.tama;
    if (action === "carinho") { t.fun = cl100(t.fun + 8); gainBond(d, 2); }
    else if (action === "limpar") { t.hygiene = cl100(t.hygiene + 25); gainBond(d, 2); }
    else if (action === "remedio") { t.sick = false; t.fun = cl100(t.fun + 5); gainBond(d, 3); }
    else if (action === "brincar_win") { t.fun = cl100(t.fun + 18); gainBond(d, 4); }
    else if (action === "brincar_ok") { t.fun = cl100(t.fun + 6); gainBond(d, 1); }
    d.tama = { ...t };
    return d;
  });

  const pickStarter = (type) => setData((prev) => {
    const d = { ...prev, tama: { ...(prev.tama || freshTama()) } };
    d.tama.type = type; d.tama.stage = 0; d.tama.bond = 0; d.tama.startedAt = new Date().toISOString();
    return d;
  });

  /* ---------- água em copos de 250ml (XP só até a meta, sem farm) ---------- */
  const addWater = (delta) => {
    setData((prev) => {
      const d = { ...prev };
      const today = dayKey();
      const goalCups = cupsForLiters(d.waterGoalL || WATER_GOAL_L_DEFAULT);
      const cur = d.water && d.water.date === today ? d.water.count : 0;
      const next = Math.max(0, cur + delta);
      if (next === cur) return prev;
      d.water = { date: today, count: next };
      if (delta > 0) {
        const scored = d.waterScored && d.waterScored.date === today ? d.waterScored.cups : 0;
        // só pontua "degraus" novos, nunca repete, e nunca passa da meta
        if (next <= goalCups && next > scored) {
          const prevLevel = levelFromXp(d.xpTotal).level;
          d.xpTotal += WATER_XP; d.gold += WATER_XP;
          d.waterScored = { date: today, cups: next };
          markActive(d);
          bumpEnergy(d, ENERGY_RECOVER_WATER);
          const newLevel = levelFromXp(d.xpTotal).level;
          if (newLevel > prevLevel) {
            d.gems = (d.gems || 0) + GEMS_PER_LEVEL * (newLevel - prevLevel);
            if (d.soundOn) sound.levelUp();
            setLevelUpBanner(newLevel);
            setTimeout(() => setLevelUpBanner(null), 2600);
          } else if (d.soundOn) sound.ding();
          spawnPop(`+${WATER_XP} XP`, CATS.saude.color); spawnParticles(CATS.saude.color);
        }
      }
      return d;
    });
  };

  /* ---------- tarefas pendentes para Modo Foco / Rápida ---------- */
  const todayTasks = allTasks.filter(isActiveToday);
  const visibleTasks = todayTasks.filter((t) => (quickOnly ? t.xp <= 5 : true));
  const pending = todayTasks.filter((t) => !data.doneToday.includes(t.id));

  /* ============================================================ */
  return (
    <div style={{ background: `radial-gradient(circle at 50% 0%, ${C.night2}, ${C.night})`, minHeight: "100vh" }}
      className="font-sans text-base relative overflow-x-hidden">
      <Keyframes />

      {/* área central de efeitos */}
      <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center" style={{ paddingTop: "32vh" }}>
        <div className="relative">
          {pops.map((p) => (
            <div key={p.id} style={{ color: p.color, animation: "floatUp 1.4s ease-out forwards", textShadow: "0 2px 0 rgba(0,0,0,.4)" }}
              className="absolute -translate-x-1/2 font-serif text-3xl font-black">{p.text}</div>
          ))}
          {particles.map((p) => (
            <span key={p.id} style={{ background: p.color, "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, animation: "burst 0.85s ease-out forwards" }}
              className="absolute h-2 w-2 rounded-full" />
          ))}
        </div>
      </div>

      {/* banner level up */}
      {levelUpBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-6">
          <div style={{ background: C.parch, border: `4px solid ${C.gold}`, boxShadow: "0 20px 50px rgba(0,0,0,.5)", animation: "popIn .5s ease-out" }}
            className="rounded-2xl px-7 py-6 text-center max-w-xs w-full">
            <div className="text-5xl" style={{ animation: "wiggle 1s ease-in-out infinite" }}>🎉</div>
            <div style={{ color: C.goldDeep }} className="font-serif text-2xl font-black mt-2">SUBIU DE NÍVEL!</div>
            <div style={{ color: C.ink }} className="font-serif text-4xl font-black mt-1">Nível {levelUpBanner}</div>
            <div style={{ color: C.inkSoft }} className="text-sm mt-2">Novas moedas liberadas. Continue a jornada!</div>
          </div>
        </div>
      )}

      {/* banner chefe derrotado */}
      {bossBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-6">
          <div style={{ background: "#2a0e12", border: `4px solid ${C.ember}`, boxShadow: "0 20px 60px rgba(0,0,0,.6)", animation: "popIn .5s ease-out" }}
            className="rounded-2xl px-7 py-6 text-center max-w-xs w-full">
            <div className="text-5xl" style={{ animation: "wiggle 1s ease-in-out infinite" }}>{bossBanner.emoji}</div>
            <div style={{ color: C.ember }} className="font-serif text-2xl font-black mt-2">CHEFE DERROTADO!</div>
            <div style={{ color: C.parch }} className="font-serif text-lg mt-1">{bossBanner.name}</div>
            <div style={{ color: C.gold }} className="text-sm mt-2 font-bold">+{bossBanner.rewardXp} XP · +{bossBanner.rewardGold} 🪙 · +{bossBanner.rewardGems} 💎</div>
            <div style={{ color: C.parch }} className="text-sm mt-1">Loot: {bossBanner.loot}</div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed left-1/2 z-50 -translate-x-1/2" style={{ top: 12 }}>
          <div style={{ background: C.ink, color: C.parch, border: `2px solid ${C.gold}`, animation: "popIn .3s ease-out" }}
            className="rounded-full px-4 py-2 text-sm font-semibold shadow-lg max-w-[90vw] text-center">{toast}</div>
        </div>
      )}

      {/* MODO FOCO */}
      {focusMode && (
        <FocusOverlay pending={pending} onClose={() => setFocusMode(false)} onDone={toggleTask} />
      )}

      {/* conteúdo */}
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <InstallHint />
        {tab === "aventura" && (
          <Aventura {...{ data, level, xpInLevel, xpForNext, pct, playerClass, petStage, journeyStage,
            visibleTasks, quickOnly, setQuickOnly, toggleTask, setFocusMode, pending, allTasks: todayTasks, update,
            openGame: () => setShowGame(true) }} />
        )}
        {tab === "loja" && <Loja data={data} buyReward={buyReward} buyCosmetic={buyCosmetic} update={update} />}
        {tab === "pet" && <Pet data={data} tama={tama} tamaCare={tamaCare} pickStarter={pickStarter} update={update} />}
        {tab === "avatar" && <Avatar data={data} level={level} journeyStage={journeyStage} petEnergy={tAvg} update={update} />}
        {tab === "saude" && <Saude data={data} addWater={addWater} toggleTask={toggleTask} update={update}
          medDone={(() => { const ids = (data.meds || []).map((m) => m.id); return ids.length > 0 && ids.every((id) => data.doneToday.includes(id)); })()} />}
        {tab === "stats" && <Stats data={data} level={level} playerClass={playerClass} sound={sound} update={update} onSignOut={onSignOut} user={user} />}
      </main>

      {/* navegação inferior */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-3 pb-3">
        <div style={{ background: C.parch, border: `3px solid ${C.goldDeep}`, boxShadow: "0 -6px 24px rgba(0,0,0,.4)" }}
          className="flex items-center justify-between rounded-2xl px-2 py-2">
          {[
            { k: "aventura", icon: Sword, label: "Missões" },
            { k: "pet", icon: PawPrint, label: "Pet" },
            { k: "avatar", icon: Smile, label: "Avatar" },
            { k: "loja", icon: Store, label: "Loja" },
            { k: "saude", icon: Heart, label: "Saúde" },
            { k: "stats", icon: BarChart3, label: "Status" },
          ].map(({ k, icon: Icon, label }) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)}
                style={{ background: on ? C.gold : "transparent", color: on ? C.ink : C.inkSoft }}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-all active:scale-95">
                <Icon size={18} strokeWidth={2.4} />
                <span className="text-[9px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showGame && (
        <RoutineDefense
          avatarSrc={level >= AVATAR_SUPREMO_LEVEL ? AVATAR_IMG.supremo : AVATAR_IMG.normal}
          best={data.gameBest || 0}
          onRunEnd={endGame}
          onClose={() => setShowGame(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   COMPONENTES DE TELA
   ============================================================ */

function Panel({ children, style, className = "" }) {
  return (
    <div style={{ background: C.parch, border: `3px solid ${C.goldDeep}`, boxShadow: "0 6px 0 rgba(0,0,0,.25)", ...style }}
      className={`rounded-2xl p-4 ${className}`}>{children}</div>
  );
}
function Tag({ children, color }) {
  return <span style={{ background: color, color: "#fff" }} className="rounded-full px-2 py-0.5 text-[11px] font-bold">{children}</span>;
}

/* ---------- AVENTURA (tela principal) ---------- */
function useInstallState() {
  const [, force] = useState(0);
  useEffect(() => subscribeInstall(() => force((x) => x + 1)), []);
  return { canInstall: !!getDeferred(), ios: isIOS(), standalone: isStandalone(), install: doInstall };
}

function InstallHint() {
  const { canInstall, ios, standalone, install } = useInstallState();
  const [dismissed, setDismissed] = useState(false);
  if (standalone || dismissed) return null;
  if (!canInstall && !ios) return null;
  return (
    <Panel style={{ background: C.night2, borderColor: C.gold }} className="mb-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📲</span>
        <div className="flex-1 text-sm" style={{ color: C.parch }}>
          {ios && !canInstall
            ? <>Instale o QuesTAH: toque em <b>Compartilhar</b> e depois <b>Adicionar à Tela de Início</b>.</>
            : <>Instale o QuesTAH na tela inicial e jogue como um app de verdade.</>}
        </div>
        {canInstall && (
          <button onClick={install} style={{ background: C.gold, color: C.ink }} className="rounded-xl px-3 py-1.5 text-sm font-bold active:scale-95 transition">Instalar</button>
        )}
        <button onClick={() => setDismissed(true)} style={{ color: C.parch2 }} className="p-1"><X size={16} /></button>
      </div>
    </Panel>
  );
}

function Aventura({ data, level, xpInLevel, xpForNext, pct, playerClass, petStage, journeyStage,
  visibleTasks, quickOnly, setQuickOnly, toggleTask, setFocusMode, pending, allTasks, update, openGame }) {
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const tasks = data.tasks || [];
  const grouped = { pet: [], casa: [], pessoal: [] };
  visibleTasks.forEach((t) => { if (!grouped[t.category]) grouped[t.category] = []; grouped[t.category].push(t); });
  const doneCount = allTasks.filter((t) => data.doneToday.includes(t.id)).length;

  const saveTask = (task) => {
    const exists = tasks.find((t) => t.id === task.id);
    update({ tasks: exists ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task] });
    setAdding(false); setEditingTask(null);
  };
  const removeTask = (id) => update({ tasks: tasks.filter((t) => t.id !== id), doneToday: data.doneToday.filter((x) => x !== id) });

  return (
    <div className="space-y-4">
      {/* cabeçalho do herói */}
      <Panel style={{ background: `linear-gradient(160deg, ${C.parch}, ${C.parch2})` }}>
        <div className="flex items-start justify-between">
          <div>
            <div style={{ color: C.inkSoft }} className="text-xs font-bold uppercase tracking-wide">Herói</div>
            <EditableName data={data} update={update} />
            <div style={{ color: C.goldDeep }} className="mt-1 flex items-center gap-1 font-serif text-sm font-bold">
              <Crown size={14} /> {playerClass}
            </div>
          </div>
          <div style={{ background: C.gold, color: C.ink, border: `3px solid ${C.goldDeep}` }}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full font-serif leading-none">
            <span className="text-[9px] font-bold">NÍVEL</span>
            <span className="text-2xl font-black">{level}</span>
          </div>
        </div>
        {/* barra XP */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs font-bold" style={{ color: C.ink }}>
            <span>XP</span><span>{xpInLevel} / {xpForNext}</span>
          </div>
          <div style={{ background: "rgba(58,42,24,.18)" }} className="h-4 w-full overflow-hidden rounded-full">
            <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.xpDeep}, ${C.xp})`, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }}
              className="h-full rounded-full" />
          </div>
        </div>
        {/* recursos */}
        <div className="mt-3 flex items-center justify-between text-sm font-bold" style={{ color: C.ink }}>
          <span className="flex items-center gap-1"><Coins size={16} style={{ color: C.goldDeep }} /> {data.gold}</span>
          <span className="flex items-center gap-1"><Gem size={15} style={{ color: "#9b59b6" }} /> {data.gems || 0}</span>
          <span className="flex items-center gap-1"><Flame size={16} style={{ color: C.ember }} /> {data.currentStreak} dias</span>
        </div>
      </Panel>

      {/* mini-game */}
      <button onClick={openGame}
        style={{ background: `linear-gradient(160deg, ${C.night2}, ${C.night})`, border: `3px solid ${C.gold}`, boxShadow: "0 4px 0 rgba(0,0,0,.25)" }}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-[.98] transition">
        <span className="text-3xl">🎮</span>
        <div className="flex-1">
          <div style={{ color: C.parch }} className="font-serif font-black">Defesa da Rotina</div>
          <div style={{ color: C.parch2 }} className="text-xs">Defenda a casa do Caos e ganhe gemas 💎</div>
        </div>
        <span style={{ color: C.gold }} className="text-xs font-bold">Recorde: {data.gameBest || 0}</span>
      </button>

      {/* aviso de streak quebrada (gentil) */}
      {data.streakBrokenNote && (
        <Panel style={{ background: "#fff7e6", borderColor: C.ember }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
            <span className="text-xl">🌅</span>
            <span><b>Todo herói tropeça.</b> Continue a jornada — uma tarefa hoje reacende a chama.</span>
          </div>
        </Panel>
      )}

      {/* aviso do Modo Difícil */}
      {data.hardPenaltyNote ? (
        <Panel style={{ background: "#2a0e12", borderColor: C.ember }}>
          <div className="flex items-center justify-between gap-2 text-sm" style={{ color: C.parch }}>
            <span className="flex items-center gap-2"><span className="text-xl">⚔️</span><span><b>Modo Difícil:</b> você perdeu <b>{data.hardPenaltyNote} XP</b> por missões de ontem. Cada dia é uma chance nova.</span></span>
            <button onClick={() => update({ hardPenaltyNote: null })} style={{ color: C.parch2 }} className="p-1"><X size={16} /></button>
          </div>
        </Panel>
      ) : null}

      {/* botões TDAH */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setFocusMode(true)} disabled={!pending.length}
          style={{ background: C.night2, border: `3px solid ${C.gold}`, opacity: pending.length ? 1 : 0.5 }}
          className="flex items-center justify-center gap-2 rounded-2xl py-3 font-serif font-bold text-white active:scale-95 transition">
          <Target size={20} style={{ color: C.gold }} /> Modo Foco
        </button>
        <button onClick={() => setQuickOnly((q) => !q)}
          style={{ background: quickOnly ? C.gold : C.night2, color: quickOnly ? C.ink : "#fff", border: `3px solid ${C.gold}` }}
          className="flex items-center justify-center gap-2 rounded-2xl py-3 font-serif font-bold active:scale-95 transition">
          <Zap size={20} /> Missão Rápida
        </button>
      </div>

      {/* progresso do dia */}
      <div style={{ color: C.parch }} className="flex items-center justify-between px-1 text-sm font-bold">
        <span className="font-serif text-lg">Missões Diárias</span>
        <span className="flex items-center gap-3">
          <span style={{ color: C.gold }}>{doneCount}/{allTasks.length}</span>
          <button onClick={() => { setEditMode((e) => !e); setEditingTask(null); setAdding(false); }}
            style={{ color: editMode ? C.gold : C.parch2 }} className="flex items-center gap-1 text-xs font-bold">
            <Pencil size={14} /> {editMode ? "Pronto" : "Editar"}
          </button>
        </span>
      </div>

      {(adding || editingTask) && (
        <TaskForm initial={editingTask} onCancel={() => { setAdding(false); setEditingTask(null); }} onSave={saveTask} />
      )}

      {Object.entries(grouped).map(([cat, list]) => list.length > 0 && (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">{CATS[cat].emoji}</span>
            <span style={{ color: C.parch }} className="font-serif font-bold">{CATS[cat].label}</span>
          </div>
          {list.map((t) => {
            const done = data.doneToday.includes(t.id);
            return (
              <div key={t.id} className="flex items-center gap-2">
                <button onClick={() => (editMode ? setEditingTask(t) : toggleTask(t))}
                  style={{ background: done ? "rgba(244,230,197,.45)" : C.parch, border: `3px solid ${done ? C.xpDeep : C.goldDeep}`, boxShadow: done ? "none" : "0 4px 0 rgba(0,0,0,.2)" }}
                  className="flex flex-1 items-center gap-3 rounded-2xl p-3 text-left active:scale-[.98] transition">
                  <span style={{ background: done ? C.xp : "transparent", border: `2px solid ${done ? C.xpDeep : C.inkSoft}`, color: "#fff" }}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
                    {editMode ? <Pencil size={14} style={{ color: C.inkSoft }} /> : (done && <Check size={18} strokeWidth={3} />)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span style={{ color: C.ink, textDecoration: done && !editMode ? "line-through" : "none", opacity: done && !editMode ? 0.6 : 1 }}
                      className="block font-bold leading-tight">{t.name}</span>
                    <span style={{ color: C.inkSoft }} className="block text-xs">{t.desc}</span>
                  </span>
                  <span className="flex flex-shrink-0 flex-col items-end gap-1">
                    <Tag color={C.xpDeep}>+{t.xp} XP</Tag>
                    {t.xp <= 5 && <span style={{ color: C.inkSoft }} className="text-[9px] font-bold">⚡ rápida</span>}
                  </span>
                </button>
                {editMode && (
                  <button onClick={() => removeTask(t.id)} style={{ color: C.ember }} className="p-1 active:scale-90 transition"><Trash2 size={16} /></button>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* adicionar tarefa */}
      {!adding && !editingTask && (
        <button onClick={() => { setAdding(true); setEditMode(false); }} style={{ borderColor: C.gold, color: C.parch }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-sm font-bold active:scale-95 transition">
          <Plus size={18} /> Criar nova missão
        </button>
      )}
    </div>
  );
}

function EditableName({ data, update }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(data.playerName);
  if (editing) {
    return (
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onBlur={() => { update({ playerName: val.trim() || "Herói" }); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={{ color: C.ink, borderColor: C.goldDeep }}
        className="w-40 border-b-2 bg-transparent font-serif text-2xl font-black outline-none" />
    );
  }
  return (
    <button onClick={() => { setVal(data.playerName); setEditing(true); }} style={{ color: C.ink }}
      className="font-serif text-2xl font-black leading-tight">{data.playerName} ✎</button>
  );
}

function TaskForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [desc, setDesc] = useState(initial?.desc || "");
  const [xp, setXp] = useState(initial?.xp || 10);
  const [cat, setCat] = useState(initial?.category || "casa");
  const [days, setDays] = useState(initial?.days || []);
  const WD = [["Dom", 0], ["Seg", 1], ["Ter", 2], ["Qua", 3], ["Qui", 4], ["Sex", 5], ["Sáb", 6]];
  const toggleDay = (n) => setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort((a, b) => a - b)));
  const cats = Object.entries(CATS).filter(([k]) => k !== "saude");
  const submit = () => {
    if (!name.trim()) return;
    const t = { ...(initial || {}), id: initial?.id || "c_" + Math.random().toString(36).slice(2), name: name.trim(), desc: desc.trim(), xp, category: cat };
    if (days.length) t.days = days; else delete t.days;
    onSave(t);
  };
  return (
    <Panel>
      <div style={{ color: C.ink }} className="font-serif font-bold mb-2">{initial ? "Editar missão" : "Nova missão"}</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da missão"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (opcional)"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <div className="mb-2 flex gap-2">
        {cats.map(([k, v]) => (
          <button key={k} onClick={() => setCat(k)} style={{ background: cat === k ? v.color : "rgba(0,0,0,.06)", color: cat === k ? "#fff" : C.ink }}
            className="flex-1 rounded-xl py-2 text-sm font-bold">{v.emoji} {v.label}</button>
        ))}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color: C.ink }} className="text-sm font-bold">XP:</span>
        {[5, 10, 15, 20].map((n) => (
          <button key={n} onClick={() => setXp(n)} style={{ background: xp === n ? C.xpDeep : "rgba(0,0,0,.06)", color: xp === n ? "#fff" : C.ink }}
            className="flex-1 rounded-lg py-1.5 text-sm font-bold">{n}</button>
        ))}
      </div>
      <div className="mb-3">
        <div style={{ color: C.inkSoft }} className="mb-1 text-xs font-bold">Dias da semana (vazio = todo dia)</div>
        <div className="flex gap-1">
          {WD.map(([lbl, n]) => (
            <button key={n} onClick={() => toggleDay(n)} style={{ background: days.includes(n) ? C.gold : "rgba(0,0,0,.06)", color: days.includes(n) ? C.ink : C.inkSoft }}
              className="flex-1 rounded-lg py-1.5 text-[11px] font-bold">{lbl}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
        <button onClick={submit} style={{ background: C.xpDeep, color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">Salvar</button>
      </div>
    </Panel>
  );
}

/* ---------- MODO FOCO ---------- */
function FocusOverlay({ pending, onClose, onDone }) {
  const [i, setI] = useState(0);
  const list = pending;
  const t = list[i];
  useEffect(() => { if (i >= list.length && list.length) setI(list.length - 1); }, [list.length, i]);

  if (!t) {
    return (
      <div style={{ background: `radial-gradient(circle at 50% 40%, ${C.night2}, ${C.night})` }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-6xl" style={{ animation: "wiggle 1.2s ease-in-out infinite" }}>🏆</div>
        <div style={{ color: C.gold }} className="mt-4 font-serif text-2xl font-black">Tudo concluído!</div>
        <div style={{ color: C.parch }} className="mt-1">Você limpou o quadro de missões. Lendário.</div>
        <button onClick={onClose} style={{ background: C.gold, color: C.ink }} className="mt-6 rounded-2xl px-6 py-3 font-serif font-bold">Voltar</button>
      </div>
    );
  }
  return (
    <div style={{ background: `radial-gradient(circle at 50% 30%, ${C.night2}, ${C.night})` }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center">
      <button onClick={onClose} style={{ color: C.parch }} className="absolute right-5 top-5"><X size={28} /></button>
      <div style={{ color: C.gold }} className="text-sm font-bold uppercase tracking-widest">Foco · {i + 1} de {list.length}</div>
      <div className="my-6 text-7xl" style={{ animation: "float 3s ease-in-out infinite" }}>{CATS[t.category].emoji}</div>
      <div style={{ color: C.parch }} className="font-serif text-3xl font-black leading-tight">{t.name}</div>
      <div style={{ color: C.parch2 }} className="mt-2">{t.desc}</div>
      <div style={{ color: C.gold }} className="mt-3 font-bold">Recompensa: +{t.xp} XP</div>
      <button onClick={() => { onDone(t); }} style={{ background: C.xp, color: "#06250d", boxShadow: "0 6px 0 #2a6b32" }}
        className="mt-8 flex items-center gap-2 rounded-3xl px-10 py-4 font-serif text-xl font-black active:translate-y-1 active:shadow-none transition">
        <Check size={26} strokeWidth={3} /> Concluir
      </button>
      {list.length > 1 && (
        <button onClick={() => setI((x) => (x + 1) % list.length)} style={{ color: C.parch2 }} className="mt-4 text-sm font-bold">
          Pular para a próxima →
        </button>
      )}
    </div>
  );
}

/* ---------- LOJA ---------- */
function Loja({ data, buyReward, buyCosmetic, update }) {
  const [sub, setSub] = useState("recompensas");
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState(null);
  return (
    <div className="space-y-4">
      {/* alternância */}
      <div className="flex gap-2">
        <button onClick={() => setSub("recompensas")}
          style={{ background: sub === "recompensas" ? C.gold : C.night2, color: sub === "recompensas" ? C.ink : "#fff", border: `3px solid ${C.gold}` }}
          className="flex-1 rounded-2xl py-2.5 font-serif font-bold active:scale-95 transition">🪙 Recompensas</button>
        <button onClick={() => setSub("cosmeticos")}
          style={{ background: sub === "cosmeticos" ? "#9b59b6" : C.night2, color: "#fff", border: "3px solid #9b59b6" }}
          className="flex-1 rounded-2xl py-2.5 font-serif font-bold active:scale-95 transition">💎 Cosméticos</button>
      </div>

      {sub === "recompensas" && (
        <>
          <Panel style={{ background: `linear-gradient(160deg, ${C.parch}, ${C.parch2})` }}>
            <div className="flex items-center justify-between">
              <div style={{ color: C.ink }} className="font-serif text-xl font-black">🏪 Recompensas reais</div>
              <span style={{ color: C.goldDeep }} className="flex items-center gap-1 font-bold"><Coins size={18} /> {data.gold}</span>
            </div>
            <p style={{ color: C.inkSoft }} className="mt-1 text-sm">Troque o ouro suado por prazeres reais. Você merece.</p>
          </Panel>

          {data.rewards.map((rw) => {
            const can = data.gold >= rw.cost;
            return (
              <Panel key={rw.id} className="flex items-center gap-3">
                <span className="text-3xl">{rw.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div style={{ color: C.ink }} className="font-bold leading-tight">{rw.name}</div>
                  <div style={{ color: C.goldDeep }} className="flex items-center gap-1 text-sm font-bold"><Coins size={13} /> {rw.cost}</div>
                </div>
                <button onClick={() => setEdit(rw)} style={{ color: C.inkSoft }} className="p-1"><Trash2 size={16} /></button>
                <button onClick={() => buyReward(rw)} disabled={!can}
                  style={{ background: can ? C.xpDeep : "rgba(0,0,0,.15)", color: can ? "#fff" : C.inkSoft }}
                  className="rounded-xl px-4 py-2 text-sm font-bold active:scale-95 transition">Resgatar</button>
              </Panel>
            );
          })}

          {edit && (
            <Panel style={{ borderColor: C.ember }}>
              <div style={{ color: C.ink }} className="text-sm">Remover <b>{edit.name}</b> da loja?</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setEdit(null)} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
                <button onClick={() => { update({ rewards: data.rewards.filter((r) => r.id !== edit.id) }); setEdit(null); }}
                  style={{ background: C.ember, color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">Remover</button>
              </div>
            </Panel>
          )}

          {adding ? (
            <AddRewardForm onCancel={() => setAdding(false)} onAdd={(r) => { update({ rewards: [...data.rewards, r] }); setAdding(false); }} />
          ) : (
            <button onClick={() => setAdding(true)} style={{ borderColor: C.gold, color: C.parch }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-sm font-bold active:scale-95 transition">
              <Plus size={18} /> Criar recompensa
            </button>
          )}

          {data.purchases.length > 0 && (
            <Panel>
              <div style={{ color: C.ink }} className="mb-2 font-serif font-bold">📜 Histórico</div>
              <div className="space-y-1">
                {data.purchases.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm" style={{ color: C.inkSoft }}>
                    <span>{p.emoji} {p.name}</span>
                    <span>-{p.cost} 🪙</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      {sub === "cosmeticos" && <Cosmeticos data={data} buyCosmetic={buyCosmetic} update={update} />}
    </div>
  );
}

function Cosmeticos({ data, buyCosmetic, update }) {
  const cos = data.cosmetics || { owned: [], equipped: {} };
  const gems = data.gems || 0;
  const equip = (item) => {
    const isEq = cos.equipped[item.slot] === item.id;
    update({ cosmetics: { ...cos, equipped: { ...cos.equipped, [item.slot]: isEq ? null : item.id } } });
  };
  const groups = [["pet", "🐾 Pet"], ["avatar", "🧑 Avatar"]];
  return (
    <>
      <Panel style={{ background: "linear-gradient(160deg, #efe2f7, #ead2a0)" }}>
        <div className="flex items-center justify-between">
          <div style={{ color: C.ink }} className="font-serif text-xl font-black">💎 Cosméticos</div>
          <span style={{ color: "#7d3ca6" }} className="flex items-center gap-1 font-bold"><Gem size={16} /> {gems}</span>
        </div>
        <p style={{ color: C.inkSoft }} className="mt-1 text-sm">Gaste suas gemas em itens pro Pet e pro Avatar. Alguns dão +1 gema por dia. 💎</p>
      </Panel>

      {groups.map(([t, label]) => (
        <div key={t} className="space-y-2">
          <div style={{ color: C.parch }} className="px-1 font-serif text-lg font-bold">{label}</div>
          {COSMETICS.filter((c) => c.target === t).map((item) => {
            const owned = cos.owned.includes(item.id);
            const equipped = cos.equipped[item.slot] === item.id;
            const can = gems >= item.cost;
            return (
              <Panel key={item.id} className="flex items-center gap-3">
                <span className="text-3xl">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div style={{ color: C.ink }} className="font-bold leading-tight">{item.name}</div>
                  {item.bonusGems ? <div style={{ color: "#2a8c7e" }} className="text-xs font-bold">+{item.bonusGems} 💎/dia</div> : null}
                  {!owned && <div style={{ color: "#7d3ca6" }} className="flex items-center gap-1 text-sm font-bold"><Gem size={12} /> {item.cost}</div>}
                </div>
                {owned ? (
                  <button onClick={() => equip(item)}
                    style={{ background: equipped ? C.xpDeep : "rgba(0,0,0,.08)", color: equipped ? "#fff" : C.ink }}
                    className="rounded-xl px-4 py-2 text-sm font-bold active:scale-95 transition">{equipped ? "Equipado ✓" : "Equipar"}</button>
                ) : (
                  <button onClick={() => buyCosmetic(item)} disabled={!can}
                    style={{ background: can ? "#9b59b6" : "rgba(0,0,0,.15)", color: can ? "#fff" : C.inkSoft }}
                    className="rounded-xl px-4 py-2 text-sm font-bold active:scale-95 transition">Comprar</button>
                )}
              </Panel>
            );
          })}
        </div>
      ))}
    </>
  );
}

function AddRewardForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState(100);
  const [emoji, setEmoji] = useState("🎁");
  const opts = ["🎁", "📺", "🍫", "🎮", "🍔", "☕", "🛌", "🎬", "🍦", "🛍️"];
  return (
    <Panel>
      <div style={{ color: C.ink }} className="mb-2 font-serif font-bold">Nova recompensa</div>
      <div className="mb-2 flex flex-wrap gap-1">
        {opts.map((e) => (
          <button key={e} onClick={() => setEmoji(e)} style={{ background: emoji === e ? C.gold : "rgba(0,0,0,.06)" }}
            className="rounded-lg px-2 py-1 text-xl">{e}</button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: maratona de série"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: C.ink }} className="text-sm font-bold">Custo:</span>
        <input type="number" value={cost} min={1} onChange={(e) => setCost(Math.max(1, parseInt(e.target.value) || 1))}
          style={{ borderColor: C.goldDeep, color: C.ink }} className="w-24 rounded-xl border-2 bg-white/60 px-3 py-1.5 outline-none" />
        <span style={{ color: C.goldDeep }} className="text-sm font-bold">🪙</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
        <button onClick={() => { if (name.trim()) onAdd({ id: "rw_" + Math.random().toString(36).slice(2), name: name.trim(), cost, emoji }); }}
          style={{ background: C.xpDeep, color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">Adicionar</button>
      </div>
    </Panel>
  );
}

/* ---------- PET (genérico: espécie + cor) ---------- */
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

function Pet({ data, tama, tamaCare, pickStarter, update }) {
  const pet = data.pet || DEFAULT_PET;
  const setPet = (patch) => update({ pet: { ...pet, ...patch } });
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(pet.name);
  const [, setTick] = useState(0);
  const [game, setGame] = useState(null); // null | 'play' | 'win' | 'ok'
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 20000); return () => clearInterval(id); }, []);

  const t = decayTama(data.tama || freshTama());

  // ---- ainda sem inicial: tela de escolha do ovo ----
  if (!t.type) {
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <div style={{ color: C.ink }} className="font-serif text-xl font-black">Escolha seu Ovo Digital 🥚</div>
          <p style={{ color: C.inkSoft }} className="mt-1 mb-3 text-sm">Cada tipo choca um monstrinho diferente. Cuide bem dele (com as missões e o carinho) e ele evolui!</p>
          <div className="grid grid-cols-3 gap-2">
            {MON_TYPES.map((m) => (
              <button key={m.id} onClick={() => pickStarter(m.id)}
                style={{ background: "rgba(0,0,0,.04)", borderColor: m.color }}
                className="rounded-2xl border-2 p-2 active:scale-95 transition">
                <img src={monSrc(m.id, 0)} alt={m.label} style={{ width: "100%", imageRendering: "pixelated" }} />
                <div style={{ color: m.color }} className="text-sm font-bold">{m.emoji} {m.label}</div>
                <div style={{ color: C.inkSoft }} className="text-[10px] leading-tight">{m.vibe}</div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  const typeInfo = MON_TYPES.find((m) => m.id === t.type) || MON_TYPES[0];
  const mood = tamaMoodLabel(t);
  const poop = t.hygiene < 45 && !t.sick;
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(t.startedAt || Date.now()).getTime()) / 86400000));
  const evoPct = t.stage < MON_MAX_STAGE ? Math.min(100, Math.round((t.bond / MON_EVO[t.stage]) * 100)) : 100;

  const METERS = [
    { key: "hunger", label: "Fome", emoji: "🍖", color: "#e8843a", nudge: "Hora de pôr comida pra Mona de verdade 🍖" },
    { key: "thirst", label: "Água", emoji: "💧", color: "#3a8fd8", nudge: "Troca a aguinha da Mona 💧" },
    { key: "hygiene", label: "Higiene", emoji: "🧹", color: "#2a8c4a", nudge: "A caixa de areia pede limpeza 🧹" },
    { key: "fun", label: "Felicidade", emoji: "🧶", color: C.rose, nudge: "Ele quer brincar — dá uma atenção 🧶" },
  ];
  const lows = METERS.filter((m) => t[m.key] < 35).sort((a, b) => t[a.key] - t[b.key]);

  const play = (pick) => {
    const monPick = Math.random() < 0.5 ? "L" : "R";
    if (pick === monPick) { tamaCare("brincar_win"); setGame("win"); }
    else { tamaCare("brincar_ok"); setGame("ok"); }
  };

  return (
    <div className="space-y-4">
      {/* comemoração de evolução */}
      {t.justEvolved != null && (
        <Panel style={{ background: "#fff7e6", borderColor: C.gold }} className="text-center">
          <div className="text-3xl">🎉</div>
          <div style={{ color: C.ink }} className="font-serif font-black">{pet.name} evoluiu para {MON_STAGES[t.justEvolved]}!</div>
          <button onClick={() => update({ tama: { ...data.tama, justEvolved: null } })}
            style={{ background: C.gold, color: C.ink }} className="mt-2 rounded-xl px-4 py-1.5 text-sm font-bold active:scale-95 transition">Oba! 🎈</button>
        </Panel>
      )}

      {/* cenário (quarto) */}
      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <div className="relative" style={{ height: 220, background: "linear-gradient(#cfe8ff 0%, #cfe8ff 58%, #e7c79a 58%, #d8ae79 100%)" }}>
          <div className="absolute" style={{ top: 18, left: 22, width: 46, height: 38, background: "#bfe9ff", border: "4px solid #fff", borderRadius: 6 }} />
          <div className="absolute" style={{ bottom: 16, left: "50%", transform: "translateX(-50%)", width: 160, height: 28, background: "#00000016", borderRadius: "50%" }} />
          {poop && <span className="absolute" style={{ bottom: 18, left: "28%", fontSize: 24 }}>💩</span>}
          <div className="absolute" style={{ bottom: 24, left: "50%", transform: "translateX(-50%)" }}>
            <div className="relative">
              <MonSprite type={t.type} stage={t.stage} size={132} alive={!t.sick} />
              {t.sick && <span className="absolute" style={{ top: -2, right: -8, fontSize: 26 }}>🤒</span>}
            </div>
          </div>
        </div>
      </Panel>

      {/* infos + vínculo + medidores */}
      <Panel className="text-center">
        {editingName ? (
          <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { setPet({ name: nameVal.trim() || "Monstrinho" }); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            style={{ color: C.ink, borderColor: C.goldDeep }}
            className="w-44 border-b-2 bg-transparent text-center font-serif text-2xl font-black outline-none" />
        ) : (
          <button onClick={() => { setNameVal(pet.name); setEditingName(true); }} style={{ color: C.ink }}
            className="font-serif text-2xl font-black">{pet.name} ✎</button>
        )}
        <div style={{ color: mood.color }} className="font-bold">{mood.label}</div>
        <div style={{ color: C.inkSoft }} className="mb-3 text-xs">{typeInfo.emoji} {MON_STAGES[t.stage]} · {ageDays} {ageDays === 1 ? "dia" : "dias"}</div>

        {/* vínculo / evolução */}
        <div className="text-left">
          {t.stage < MON_MAX_STAGE ? (
            <>
              <div className="mb-0.5 flex justify-between text-xs font-bold" style={{ color: C.ink }}>
                <span>✨ Vínculo · vira {MON_STAGES[t.stage + 1]}</span><span>{evoPct}%</span>
              </div>
              <div style={{ background: "rgba(58,42,24,.18)" }} className="h-3 w-full overflow-hidden rounded-full">
                <div style={{ width: `${evoPct}%`, background: `linear-gradient(90deg, ${typeInfo.color}, ${C.gold})`, transition: "width .5s" }} className="h-full rounded-full" />
              </div>
            </>
          ) : (
            <div style={{ color: C.gold }} className="text-center text-sm font-bold">✨ Forma máxima por enquanto — novos estágios em breve!</div>
          )}
        </div>

        {/* medidores */}
        <div className="mt-4 space-y-2 text-left">
          {METERS.map((m) => {
            const v = Math.round(t[m.key]);
            return (
              <div key={m.key}>
                <div className="mb-0.5 flex justify-between text-xs font-bold" style={{ color: C.ink }}>
                  <span>{m.emoji} {m.label}</span><span style={{ color: v < 25 ? "#c0392b" : C.inkSoft }}>{v}%</span>
                </div>
                <div style={{ background: "rgba(58,42,24,.18)" }} className="h-3 w-full overflow-hidden rounded-full">
                  <div style={{ width: `${v}%`, background: m.color, transition: "width .5s" }} className="h-full rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* lembrete de cuidar da Mona REAL */}
      {(lows.length > 0 || t.sick) && (
        <Panel style={{ background: "#fff7e6", borderColor: C.ember }}>
          <div style={{ color: C.ink }} className="text-sm">
            <b>{pet.name} te chama 🐾</b> — cuidar dele aqui lembra de cuidar da Mona de verdade:
            <ul className="mt-1 list-disc pl-5">
              {t.sick && <li>Ele não está bem. Remédio e cuidado ajudam a recuperar. 💛</li>}
              {lows.slice(0, 3).map((m) => <li key={m.key}>{m.nudge}</li>)}
            </ul>
          </div>
        </Panel>
      )}

      {/* interações */}
      <Panel>
        <div style={{ color: C.ink }} className="mb-2 font-serif font-bold">Cuidar agora</div>
        {game ? (
          <div className="text-center">
            {game === "play" ? (
              <>
                <div style={{ color: C.ink }} className="mb-2 text-sm font-bold">Pra que lado o {pet.name} vai pular? 🎲</div>
                <div className="flex justify-center gap-3">
                  <button onClick={() => play("L")} style={{ background: C.gold, color: C.ink }} className="rounded-xl px-6 py-3 text-2xl active:scale-90 transition">⬅️</button>
                  <button onClick={() => play("R")} style={{ background: C.gold, color: C.ink }} className="rounded-xl px-6 py-3 text-2xl active:scale-90 transition">➡️</button>
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl">{game === "win" ? "🎉" : "😸"}</div>
                <div style={{ color: C.ink }} className="mt-1 text-sm font-bold">{game === "win" ? "Acertou! Ele amou brincar com você!" : "Quase! Ele se divertiu mesmo assim."}</div>
                <button onClick={() => setGame(null)} style={{ color: C.goldDeep }} className="mt-2 text-sm font-bold">voltar</button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => tamaCare("carinho")} style={{ background: "rgba(0,0,0,.06)", color: C.ink }} className="rounded-xl py-2.5 text-sm font-bold active:scale-95 transition">🤚 Carinho</button>
            <button onClick={() => tamaCare("limpar")} style={{ background: "rgba(0,0,0,.06)", color: C.ink }} className="rounded-xl py-2.5 text-sm font-bold active:scale-95 transition">🚿 Limpar</button>
            <button onClick={() => setGame("play")} style={{ background: "rgba(0,0,0,.06)", color: C.ink }} className="rounded-xl py-2.5 text-sm font-bold active:scale-95 transition">🎮 Brincar</button>
            {t.sick
              ? <button onClick={() => tamaCare("remedio")} style={{ background: C.xpDeep, color: "#fff" }} className="rounded-xl py-2.5 text-sm font-bold active:scale-95 transition">💊 Remédio</button>
              : <div className="rounded-xl py-2.5 text-center text-xs" style={{ background: "rgba(0,0,0,.03)", color: C.inkSoft }}>💚 saudável</div>}
          </div>
        )}
        <p style={{ color: C.inkSoft }} className="mt-3 text-xs">
          As missões de <b>comida, água, areia e brincar</b> (com a Mona real) enchem os medidores e fortalecem o <b>vínculo</b>, que faz o {pet.name} evoluir. Ele fica triste/doente, mas <b>nunca</b> morre. 💛
        </p>
      </Panel>
    </div>
  );
}

/* ---------- AVATAR (camadas + desbloqueio por nível) ---------- */
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

function Avatar({ data, level, journeyStage, petEnergy = 100, update }) {
  const mood = energyMood(petEnergy);
  const supremo = level >= AVATAR_SUPREMO_LEVEL;
  const img = supremo ? AVATAR_IMG.supremo : AVATAR_IMG.normal;
  const toNext = Math.max(0, AVATAR_SUPREMO_LEVEL - level);

  return (
    <div className="space-y-4">
      <Panel style={{ background: `linear-gradient(160deg, #fbf2dc, ${C.parch2})` }} className="text-center">
        <div className="flex justify-center">
          <img src={img} alt={data.playerName} style={{ width: 200, height: 200, objectFit: "contain", animation: "float 3s ease-in-out infinite" }} />
        </div>
        <div style={{ color: C.ink }} className="mt-1 font-serif text-2xl font-black">{data.playerName}</div>
        <div style={{ color: C.goldDeep }} className="font-bold">Nível {level} · {journeyStage.emoji} {journeyStage.name}</div>
        <div className="mx-auto mt-2 max-w-[220px]">
          <div className="mb-1 flex justify-between text-[11px] font-bold" style={{ color: C.ink }}><span>⚡ Ânimo · {mood.label}</span><span>{Math.round(petEnergy)}%</span></div>
          <div style={{ background: "rgba(58,42,24,.18)" }} className="h-2.5 w-full overflow-hidden rounded-full">
            <div style={{ width: `${petEnergy}%`, background: mood.color, transition: "width .6s" }} className="h-full rounded-full" />
          </div>
        </div>
      </Panel>

      <Panel className="text-center">
        {supremo ? (
          <div style={{ color: C.goldDeep }} className="font-serif text-lg font-black">🔥 Forma Suprema desbloqueada!</div>
        ) : (
          <>
            <div style={{ color: C.ink }} className="font-serif text-lg font-bold">Forma Suprema 🔥</div>
            <p style={{ color: C.inkSoft }} className="mt-1 text-sm">Chegue ao <b>nível {AVATAR_SUPREMO_LEVEL}</b> para o seu herói evoluir. Faltam <b>{toNext}</b> {toNext === 1 ? "nível" : "níveis"}.</p>
          </>
        )}
      </Panel>
    </div>
  );
}

/* ---------- SAÚDE (cuidando de você) ---------- */
function HealthRow({ t, done, onToggle, onDelete, icon: Icon = Pill }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onToggle}
        style={{ background: done ? "rgba(52,179,160,.12)" : C.parch, border: `3px solid ${done ? C.xpDeep : "#34b3a0"}`, boxShadow: done ? "none" : "0 4px 0 rgba(0,0,0,.2)" }}
        className="flex flex-1 items-center gap-3 rounded-2xl p-3 text-left active:scale-[.98] transition">
        <span style={{ background: done ? C.xp : "transparent", border: `2px solid ${done ? C.xpDeep : C.inkSoft}`, color: "#fff" }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
          {done ? <Check size={18} strokeWidth={3} /> : <Icon size={15} style={{ color: C.inkSoft }} />}
        </span>
        <span className="min-w-0 flex-1">
          <span style={{ color: C.ink, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}
            className="block font-bold leading-tight">{t.name}</span>
          {t.desc ? <span style={{ color: C.inkSoft }} className="block text-xs">{t.desc}</span> : null}
        </span>
        <Tag color={C.xpDeep}>+{t.xp} XP</Tag>
      </button>
      {onDelete && (
        <button onClick={onDelete} style={{ color: C.ember }} className="p-1 active:scale-90 transition"><Trash2 size={16} /></button>
      )}
    </div>
  );
}

function AddMedForm({ period, onCancel, onAdd }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [xp, setXp] = useState(10);
  return (
    <Panel style={{ borderColor: "#34b3a0" }}>
      <div style={{ color: C.ink }} className="mb-2 font-serif font-bold">Novo remédio · {period === "manha" ? "manhã ☀️" : "noite 🌙"}</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do remédio"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose (ex.: 1 comprimido · 8h)"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: C.ink }} className="text-sm font-bold">XP:</span>
        {[5, 10, 15, 20].map((n) => (
          <button key={n} onClick={() => setXp(n)} style={{ background: xp === n ? C.xpDeep : "rgba(0,0,0,.06)", color: xp === n ? "#fff" : C.ink }}
            className="flex-1 rounded-lg py-1.5 text-sm font-bold">{n}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
        <button onClick={() => { if (name.trim()) onAdd({ name: name.trim(), dose: dose.trim() || "1 comprimido", xp }); }}
          style={{ background: "#34b3a0", color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">Adicionar</button>
      </div>
    </Panel>
  );
}

function WaterCard({ cups, goalCups, goalL, onAdd, onSetGoal }) {
  const liters = (cups * CUP_ML) / 1000;
  const pct = Math.min(100, Math.round((cups / goalCups) * 100));
  const fmt = (n) => String(n).replace(".", ",");
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <span style={{ background: "#3a8fd8" }} className="flex h-10 w-10 items-center justify-center rounded-xl text-white"><Droplet size={20} /></span>
        <div className="flex-1">
          <div style={{ color: C.ink }} className="font-bold leading-tight">Hidratação</div>
          <div style={{ color: C.inkSoft }} className="text-xs">{cups} copos de 250 ml</div>
        </div>
        <button onClick={() => onAdd(-1)} style={{ borderColor: C.goldDeep, color: C.inkSoft }}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 active:scale-90 transition"><Minus size={16} /></button>
        <span style={{ color: C.ink }} className="w-16 text-center font-serif text-lg font-black">{fmt(liters.toFixed(2))} L</span>
        <button onClick={() => onAdd(1)} style={{ background: "#3a8fd8", color: "#fff" }}
          className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90 transition"><Plus size={18} /></button>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs font-bold" style={{ color: C.ink }}><span>Meta: {fmt(goalL)} L</span><span>{fmt(liters.toFixed(2))}/{fmt(goalL)} L</span></div>
        <div style={{ background: "rgba(58,42,24,.18)" }} className="h-3 w-full overflow-hidden rounded-full">
          <div style={{ width: `${pct}%`, background: "#3a8fd8", transition: "width .5s" }} className="h-full rounded-full" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <span style={{ color: C.inkSoft }} className="text-[11px] font-bold">Meta diária:</span>
        {[2, 2.5, 3, 3.5].map((l) => (
          <button key={l} onClick={() => onSetGoal(l)} style={{ background: goalL === l ? "#3a8fd8" : "rgba(0,0,0,.06)", color: goalL === l ? "#fff" : C.ink }}
            className="flex-1 rounded-lg py-1 text-[11px] font-bold">{fmt(l)}L</button>
        ))}
      </div>
    </Panel>
  );
}

function MealForm({ onCancel, onAdd }) {
  const [name, setName] = useState("");
  const [xp, setXp] = useState(6);
  return (
    <Panel style={{ borderColor: "#e08a3c" }}>
      <div style={{ color: C.ink }} className="mb-2 font-serif font-bold">Nova refeição</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pré-treino, ceia…"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: C.ink }} className="text-sm font-bold">XP:</span>
        {[3, 5, 8, 10].map((n) => (
          <button key={n} onClick={() => setXp(n)} style={{ background: xp === n ? C.xpDeep : "rgba(0,0,0,.06)", color: xp === n ? "#fff" : C.ink }}
            className="flex-1 rounded-lg py-1.5 text-sm font-bold">{n}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
        <button onClick={() => { if (name.trim()) onAdd({ name: name.trim(), xp }); }}
          style={{ background: "#e08a3c", color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">Adicionar</button>
      </div>
    </Panel>
  );
}

function GlucosePanel({ data, update }) {
  const entries = Array.isArray(data.glucose) ? data.glucose : [];
  const intervalH = data.glucoseIntervalH || GLUCOSE_INTERVAL_DEFAULT;
  const [value, setValue] = useState("");
  const [tag, setTag] = useState("antes");
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  const last = entries[0];
  const nextDueTs = last ? new Date(last.ts).getTime() + intervalH * 3600000 : null;
  const overdue = !last || Date.now() >= nextDueTs;
  const fmt = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const tagLabel = (id) => (GLUCOSE_TAGS.find((t) => t.id === id) || {}).label || "";

  const add = () => {
    const v = parseInt(String(value).replace(/\D/g, ""), 10);
    if (!v || v <= 0) return;
    const entry = { id: "g_" + Math.random().toString(36).slice(2), value: v, tag, ts: new Date().toISOString() };
    update({ glucose: [entry, ...entries].slice(0, 300) });
    setValue("");
  };
  const remove = (id) => update({ glucose: entries.filter((e) => e.id !== id) });

  // mini-gráfico neutro (sem cores de "alto/baixo")
  const chronological = entries.slice(0, 14).reverse();
  let spark = null;
  if (chronological.length >= 2) {
    const vals = chronological.map((e) => e.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const wv = 300, hv = 56, pad = 6;
    const pts = chronological.map((e, i) => {
      const x = pad + (i * (wv - pad * 2)) / (chronological.length - 1);
      const y = hv - pad - ((e.value - min) / span) * (hv - pad * 2);
      return [x, y];
    });
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    spark = (
      <svg viewBox={`0 0 ${wv} ${hv}`} style={{ width: "100%", height: 56 }} preserveAspectRatio="none">
        <path d={d} fill="none" stroke={C.xpDeep} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill={C.xpDeep} />)}
      </svg>
    );
  }

  return (
    <Panel style={{ borderColor: overdue ? C.ember : "#34b3a0" }}>
      <div className="flex items-center justify-between">
        <div style={{ color: C.ink }} className="flex items-center gap-2 font-serif text-lg font-black">🩸 Glicose</div>
        {last && (
          <div className="text-right">
            <div style={{ color: C.ink }} className="text-2xl font-black leading-none">{last.value}<span className="text-xs font-bold"> mg/dL</span></div>
            <div style={{ color: C.inkSoft }} className="text-[11px]">{tagLabel(last.tag)} · {fmtTime(last.ts)}</div>
          </div>
        )}
      </div>

      {/* lembrete */}
      <div className="mt-2 rounded-xl px-3 py-2 text-sm font-bold"
        style={{ background: overdue ? "#fff1ec" : "rgba(52,179,160,.12)", color: overdue ? "#c0392b" : "#2a8c7e" }}>
        {overdue ? "⏰ Hora de medir a glicose!" : `Próxima medição por volta das ${fmtTime(nextDueTs)}`}
      </div>

      {/* intervalo do lembrete */}
      <div className="mt-2 flex items-center gap-2">
        <span style={{ color: C.inkSoft }} className="text-xs font-bold">Lembrar a cada:</span>
        {[2, 3, 4, 6].map((h) => (
          <button key={h} onClick={() => update({ glucoseIntervalH: h })}
            style={{ background: intervalH === h ? C.gold : "rgba(0,0,0,.06)", color: intervalH === h ? C.ink : C.inkSoft }}
            className="rounded-lg px-2.5 py-1 text-xs font-bold">{h}h</button>
        ))}
      </div>

      {/* registro manual */}
      <div className="mt-3 flex gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          inputMode="numeric" placeholder="ex.: 120"
          style={{ borderColor: "#34b3a0", color: C.ink }} className="w-24 rounded-xl border-2 bg-white/70 px-3 py-2 text-center font-bold outline-none" />
        <span style={{ color: C.inkSoft }} className="self-center text-sm font-bold">mg/dL</span>
        <button onClick={add} style={{ background: "#34b3a0", color: "#fff" }} className="flex-1 rounded-xl py-2 font-bold active:scale-95 transition">Anotar</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {GLUCOSE_TAGS.map((t) => (
          <button key={t.id} onClick={() => setTag(t.id)}
            style={{ background: tag === t.id ? C.gold : "rgba(0,0,0,.06)", color: tag === t.id ? C.ink : C.inkSoft }}
            className="rounded-lg px-2.5 py-1 text-xs font-bold">{t.label}</button>
        ))}
      </div>

      {spark && <div className="mt-3">{spark}</div>}

      {/* histórico */}
      {entries.length > 0 && (
        <div className="mt-3 space-y-1">
          <div style={{ color: C.inkSoft }} className="text-xs font-bold">Histórico recente</div>
          {entries.slice(0, 6).map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm" style={{ color: C.ink }}>
              <span><b>{e.value}</b> mg/dL <span style={{ color: C.inkSoft }} className="text-xs">· {tagLabel(e.tag)}</span></span>
              <span className="flex items-center gap-2">
                <span style={{ color: C.inkSoft }} className="text-xs">{fmt(e.ts)}</span>
                <button onClick={() => remove(e.id)} style={{ color: C.inkSoft }} className="p-0.5"><Trash2 size={14} /></button>
              </span>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: C.inkSoft }} className="mt-3 text-[11px]">
        Isto é um organizador dos seus registros, não um conselho médico. Siga as metas e horários combinados com seu médico. 💙
      </p>
    </Panel>
  );
}

function Saude({ data, addWater, toggleTask, update, medDone }) {
  const [addP, setAddP] = useState(null);    // 'manha' | 'noite' (remédios)
  const [addingMeal, setAddingMeal] = useState(false);
  const [editHealth, setEditHealth] = useState(false);
  const today = dayKey();
  const meds = data.meds || [];
  const meals = Array.isArray(data.meals) ? data.meals : [];
  const cups = data.water && data.water.date === today ? data.water.count : 0;
  const goalL = data.waterGoalL || WATER_GOAL_L_DEFAULT;
  const goalCups = cupsForLiters(goalL);
  const morning = meds.filter((m) => m.period === "manha");
  const night = meds.filter((m) => m.period === "noite");

  const medsDone = meds.filter((m) => data.doneToday.includes(m.id)).length;
  const mealsDone = meals.filter((m) => data.doneToday.includes(m.id)).length;
  const fracs = [Math.min(1, cups / goalCups)];
  if (meds.length) fracs.push(medsDone / meds.length);
  if (meals.length) fracs.push(mealsDone / meals.length);
  const vit = Math.round((fracs.reduce((a, b) => a + b, 0) / fracs.length) * 100);

  const addMed = (period, m) => {
    update({ meds: [...meds, { id: "m_" + Math.random().toString(36).slice(2), name: m.name, desc: m.dose, xp: m.xp, category: "saude", period, med: true }] });
    setAddP(null);
  };
  const removeMed = (id) => update({ meds: meds.filter((m) => m.id !== id), doneToday: data.doneToday.filter((x) => x !== id) });
  const addMeal = (m) => { update({ meals: [...meals, { id: "meal_" + Math.random().toString(36).slice(2), name: m.name, xp: m.xp }] }); setAddingMeal(false); };
  const removeMeal = (id) => update({ meals: meals.filter((m) => m.id !== id), doneToday: data.doneToday.filter((x) => x !== id) });

  const AddMedButton = ({ period }) => (
    <button onClick={() => setAddP(period)} style={{ borderColor: "#34b3a0", color: C.parch }}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-2.5 text-sm font-bold active:scale-95 transition">
      <Plus size={16} /> Adicionar remédio
    </button>
  );

  return (
    <div className="space-y-4">
      {/* vitalidade */}
      <Panel style={{ background: `linear-gradient(160deg, #e9fbf7, ${C.parch2})` }} className="text-center">
        <div className="text-7xl" style={{ animation: vit >= 100 ? "float 2.4s ease-in-out infinite" : "none", filter: vit >= 100 ? "none" : "grayscale(.3)" }}>
          {vit >= 100 ? "💙" : vit >= 50 ? "🩵" : "🫀"}
        </div>
        <div style={{ color: C.ink }} className="mt-1 font-serif text-2xl font-black">Sua Saúde</div>
        <div style={{ color: "#2a8c7e" }} className="font-bold">
          {vit >= 100 ? "100% em dia hoje! 💪" : "Cada cuidado conta — vamos com calma"}
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs font-bold" style={{ color: C.ink }}><span>Vitalidade de hoje</span><span>{vit}%</span></div>
          <div style={{ background: "rgba(58,42,24,.18)" }} className="h-4 w-full overflow-hidden rounded-full">
            <div style={{ width: `${vit}%`, background: "linear-gradient(90deg,#2a8c7e,#34b3a0)", transition: "width .6s" }} className="h-full rounded-full" />
          </div>
        </div>
        <div style={{ color: "#2a8c7e" }} className="mt-3 flex items-center justify-center gap-1 text-sm font-bold">
          <Flame size={16} style={{ color: C.ember }} /> {data.medStreak} dias com remédios em dia
        </div>
      </Panel>

      {/* glicose */}
      <GlucosePanel data={data} update={update} />

      {/* botão editar refeições/remédios */}
      <div className="flex justify-end px-1">
        <button onClick={() => setEditHealth((e) => !e)} style={{ color: editHealth ? C.gold : C.parch2 }} className="flex items-center gap-1 text-xs font-bold">
          <Pencil size={14} /> {editHealth ? "Pronto" : "Editar lista"}
        </button>
      </div>

      {/* manhã (remédios) */}
      <div style={{ color: C.parch }} className="flex items-center gap-2 px-1 font-serif text-lg font-bold"><Sun size={20} /> Manhã</div>
      {morning.map((t) => (
        <HealthRow key={t.id} t={t} done={data.doneToday.includes(t.id)} onToggle={() => toggleTask(t)} onDelete={editHealth ? () => removeMed(t.id) : undefined} />
      ))}
      {addP === "manha" ? <AddMedForm period="manha" onCancel={() => setAddP(null)} onAdd={(m) => addMed("manha", m)} /> : <AddMedButton period="manha" />}

      {/* refeições nomeadas */}
      <div style={{ color: C.parch }} className="flex items-center gap-2 px-1 font-serif text-lg font-bold"><Utensils size={20} /> Refeições</div>
      {meals.map((m) => (
        <HealthRow key={m.id} t={m} icon={Utensils} done={data.doneToday.includes(m.id)} onToggle={() => toggleTask({ ...m, category: "saude" })} onDelete={editHealth ? () => removeMeal(m.id) : undefined} />
      ))}
      {addingMeal ? <MealForm onCancel={() => setAddingMeal(false)} onAdd={addMeal} /> : (
        <button onClick={() => setAddingMeal(true)} style={{ borderColor: "#e08a3c", color: C.parch }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-2.5 text-sm font-bold active:scale-95 transition">
          <Plus size={16} /> Adicionar refeição
        </button>
      )}

      {/* hidratação */}
      <div style={{ color: C.parch }} className="flex items-center gap-2 px-1 font-serif text-lg font-bold"><Droplet size={20} /> Hidratação</div>
      <WaterCard cups={cups} goalCups={goalCups} goalL={goalL} onAdd={addWater} onSetGoal={(l) => update({ waterGoalL: l })} />

      {/* noite (remédios) */}
      <div style={{ color: C.parch }} className="flex items-center gap-2 px-1 font-serif text-lg font-bold"><Moon size={20} /> Noite</div>
      {night.map((t) => (
        <HealthRow key={t.id} t={t} done={data.doneToday.includes(t.id)} onToggle={() => toggleTask(t)} onDelete={editHealth ? () => removeMed(t.id) : undefined} />
      ))}
      {addP === "noite" ? <AddMedForm period="noite" onCancel={() => setAddP(null)} onAdd={(m) => addMed("noite", m)} /> : <AddMedButton period="noite" />}

      {medDone && (
        <Panel style={{ background: "#eef7ed", borderColor: C.xpDeep }}>
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: C.ink }}>
            <span className="text-xl">✅</span> Todos os remédios de hoje tomados. Orgulho de você!
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------- CHEFES (reutilizável) ---------- */
function BossList({ data }) {
  return (
    <>
      <div style={{ color: C.parch }} className="flex items-center gap-2 px-1 font-serif text-lg font-bold"><Skull size={20} /> Chefes</div>
      {BOSSES.map((b) => {
        const cur = b.metric === "medStreak" ? data.medStreak : data.tasksCompleted;
        const defeated = data.bossesDefeated.includes(b.id);
        const prog = Math.min(100, Math.round((cur / b.goal) * 100));
        return (
          <Panel key={b.id} style={{ background: defeated ? "#eef7ed" : "#2a0e12", borderColor: defeated ? C.xpDeep : C.ember }}>
            <div className="flex items-center gap-3">
              <span className="text-4xl" style={{ filter: defeated ? "grayscale(1)" : "none" }}>{b.emoji}</span>
              <div className="flex-1">
                <div style={{ color: defeated ? C.ink : C.parch }} className="font-serif font-black">{b.name}</div>
                <div style={{ color: defeated ? C.inkSoft : C.parch2 }} className="text-xs">{b.desc}</div>
              </div>
              {defeated && <Tag color={C.xpDeep}>derrotado</Tag>}
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-bold" style={{ color: defeated ? C.ink : C.parch }}>
                <span>{Math.min(cur, b.goal)}/{b.goal}</span>
                <span style={{ color: C.gold }}>+{b.rewardXp} XP · {b.loot}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,.15)" }} className="h-3 w-full overflow-hidden rounded-full">
                <div style={{ width: `${prog}%`, background: defeated ? C.xp : `linear-gradient(90deg, ${C.ember}, ${C.gold})`, transition: "width .6s" }} className="h-full rounded-full" />
              </div>
            </div>
          </Panel>
        );
      })}
    </>
  );
}

/* ---------- STATS + CONQUISTAS + AJUSTES ---------- */
function Stats({ data, level, playerClass, sound, update, onSignOut, user }) {
  const fav = Object.entries(data.catCounts).sort((a, b) => b[1] - a[1])[0];
  const favLabel = fav && fav[1] > 0 ? `${CATS[fav[0]].emoji} ${CATS[fav[0]].label}` : "—";
  const hours = ((data.tasksCompleted * 3) / 60).toFixed(1);
  const unlocked = data.achievements || [];
  const cells = [
    { label: "XP total", value: data.xpTotal, icon: "✨" },
    { label: "Nível atual", value: level, icon: "🎖️" },
    { label: "Tarefas feitas", value: data.tasksCompleted, icon: "✅" },
    { label: "Dias ativos", value: data.daysActive.length, icon: "📅" },
    { label: "Maior streak", value: `${data.longestStreak} 🔥`, icon: "🔥" },
    { label: "Categoria favorita", value: favLabel, icon: "❤️" },
    { label: "Horas economizadas", value: `${hours}h`, icon: "⏱️" },
    { label: "Ouro guardado", value: data.gold, icon: "🪙" },
    { label: "Gemas", value: data.gems || 0, icon: "💎" },
  ];
  return (
    <div className="space-y-4">
      <Panel style={{ background: `linear-gradient(160deg, ${C.parch}, ${C.parch2})` }}>
        <div style={{ color: C.ink }} className="font-serif text-xl font-black">{data.playerName}</div>
        <div style={{ color: C.goldDeep }} className="flex items-center gap-1 font-bold"><Crown size={15} /> {playerClass}</div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        {cells.map((c) => (
          <Panel key={c.label} className="text-center">
            <div className="text-2xl">{c.icon}</div>
            <div style={{ color: C.ink }} className="font-serif text-xl font-black leading-tight">{c.value}</div>
            <div style={{ color: C.inkSoft }} className="text-xs">{c.label}</div>
          </Panel>
        ))}
      </div>

      {/* conquistas */}
      <div style={{ color: C.parch }} className="px-1 font-serif text-lg font-bold flex items-center gap-2">
        <Trophy size={20} /> Conquistas <span style={{ color: C.gold }} className="text-sm">{unlocked.length}/{ACHIEVEMENTS.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.includes(a.id);
          return (
            <div key={a.id} style={{ background: got ? C.parch : "rgba(244,230,197,.25)", border: `3px solid ${got ? C.gold : "rgba(244,230,197,.3)"}`, opacity: got ? 1 : 0.6 }}
              className="flex flex-col items-center gap-1 rounded-2xl p-2 text-center">
              <span className="text-3xl" style={{ filter: got ? "none" : "grayscale(1)" }}>{got ? a.emoji : "🔒"}</span>
              <span style={{ color: got ? C.ink : C.inkSoft }} className="text-[10px] font-bold leading-tight">{a.name}</span>
              <span style={{ color: C.inkSoft }} className="text-[9px] leading-tight">{a.desc}</span>
            </div>
          );
        })}
      </div>

      {/* chefes */}
      <BossList data={data} />

      {/* ajustes */}
      <Panel>
        <button onClick={() => update({ soundOn: !data.soundOn })} className="flex w-full items-center justify-between">
          <span style={{ color: C.ink }} className="flex items-center gap-2 font-bold">
            {data.soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />} Sons do jogo
          </span>
          <span style={{ background: data.soundOn ? C.xp : "rgba(0,0,0,.2)" }} className="flex h-6 w-11 items-center rounded-full p-0.5 transition">
            <span style={{ background: "#fff", transform: data.soundOn ? "translateX(20px)" : "translateX(0)" }} className="h-5 w-5 rounded-full transition" />
          </span>
        </button>
      </Panel>

      <Panel style={{ borderColor: data.hardMode ? C.ember : C.goldDeep }}>
        <button onClick={() => { if (!data.hardMode && !confirm("Ligar o Modo Difícil? Você passará a PERDER XP pelas missões não feitas a cada dia, podendo até cair de nível. Pode desligar quando quiser.")) return; update({ hardMode: !data.hardMode }); }}
          className="flex w-full items-center justify-between">
          <span style={{ color: C.ink }} className="flex items-center gap-2 font-bold"><Skull size={18} /> Modo Difícil</span>
          <span style={{ background: data.hardMode ? C.ember : "rgba(0,0,0,.2)" }} className="flex h-6 w-11 items-center rounded-full p-0.5 transition">
            <span style={{ background: "#fff", transform: data.hardMode ? "translateX(20px)" : "translateX(0)" }} className="h-5 w-5 rounded-full transition" />
          </span>
        </button>
        <p style={{ color: C.inkSoft }} className="mt-2 text-xs">Para quem quer mais adrenalina: missões não feitas custam XP (o mesmo que valiam). Sempre opcional.</p>
      </Panel>

      <InstallSection />

      <NotificationsPanel user={user} />

      <AccountPanel user={user} />

      <button onClick={() => { if (confirm("Recomeçar a aventura do zero? Tudo será apagado.")) { update(freshData()); } }}
        style={{ color: C.ember }} className="w-full py-2 text-xs font-bold">Recomeçar aventura</button>

      <button onClick={onSignOut} style={{ color: C.parch }}
        className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold opacity-80">
        <LogOut size={16} /> Sair da conta
      </button>
    </div>
  );
}

function NotificationsPanel({ user }) {
  const supabase = getSupabase();
  const [state, setState] = useState("loading"); // loading | unsupported | need-install | ready
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!pushSupported()) {
        setState(isIOS() && !isStandalone() ? "need-install" : "unsupported");
        return;
      }
      try {
        const sub = await currentSubscription();
        setSubscribed(!!sub && typeof Notification !== "undefined" && Notification.permission === "granted");
      } catch (e) {}
      setState("ready");
    })();
  }, []);

  const enable = async () => {
    setBusy(true); setMsg("");
    const r = await enablePush(supabase, user.id);
    setBusy(false);
    if (r.ok) { setSubscribed(true); setMsg("Notificações ativadas! 🔔"); }
    else if (r.reason === "denied") setMsg("Permissão negada. Você pode liberar nas configurações do navegador, em Notificações.");
    else if (r.reason === "novapid") setMsg("Configuração ainda não disponível. Tente novamente após o próximo deploy.");
    else if (r.reason === "unsupported") setMsg("Seu navegador não suporta notificações.");
    else setMsg("Não consegui ativar agora. " + (r.error || ""));
  };
  const disable = async () => {
    setBusy(true); await disablePush(supabase); setBusy(false);
    setSubscribed(false); setMsg("Notificações desativadas.");
  };
  const test = async () => {
    try { await sendTestLocal("QuesTAH 🗡️", "Funcionou! É assim que os lembretes vão chegar."); }
    catch (e) { setMsg("Não consegui mostrar o teste."); }
  };

  if (state === "loading") return null;

  return (
    <Panel style={{ borderColor: C.gold }}>
      <div style={{ color: C.ink }} className="flex items-center gap-2 font-bold"><Bell size={16} /> Notificações</div>

      {state === "unsupported" && (
        <p style={{ color: C.inkSoft }} className="mt-1 text-sm">Seu navegador não suporta notificações push. Tente pelo Chrome (Android) ou pelo app instalado.</p>
      )}

      {state === "need-install" && (
        <p style={{ color: C.inkSoft }} className="mt-1 text-sm">No iPhone, primeiro <b>instale o app</b> (Compartilhar → Adicionar à Tela de Início). Depois volte aqui para ativar os avisos.</p>
      )}

      {state === "ready" && (
        <>
          <p style={{ color: C.inkSoft }} className="mt-1 mb-2 text-sm">Receba lembretes das missões mesmo com o app fechado.</p>
          {!subscribed ? (
            <button onClick={enable} disabled={busy} style={{ background: C.gold, color: C.ink, opacity: busy ? 0.6 : 1 }}
              className="w-full rounded-xl py-2.5 font-serif font-bold active:scale-95 transition">{busy ? "Ativando…" : "Ativar notificações"}</button>
          ) : (
            <>
              <div className="flex gap-2">
                <button onClick={test} style={{ background: C.xpDeep, color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold active:scale-95 transition">Testar agora</button>
                <button onClick={disable} disabled={busy} style={{ background: "rgba(0,0,0,.1)", color: C.ink }} className="flex-1 rounded-xl py-2 text-sm font-bold active:scale-95 transition">Desativar</button>
              </div>
              <p style={{ color: C.inkSoft }} className="mt-2 text-xs">Lembretes nos horários de manhã, tarde e noite (vamos poder ajustar depois).</p>
            </>
          )}
          {msg && <p style={{ color: C.inkSoft }} className="mt-2 text-sm">{msg}</p>}
        </>
      )}
    </Panel>
  );
}

function InstallSection() {
  const { canInstall, ios, standalone, install } = useInstallState();

  if (standalone) {
    return (
      <Panel>
        <div style={{ color: C.ink }} className="flex items-center gap-2 font-bold">📲 App instalado ✅</div>
        <p style={{ color: C.inkSoft }} className="mt-1 text-sm">Você já está jogando pelo app instalado. Boa, herói!</p>
      </Panel>
    );
  }

  return (
    <Panel style={{ borderColor: C.gold }}>
      <div style={{ color: C.ink }} className="flex items-center gap-2 font-bold">📲 Instalar o QuesTAH</div>
      <p style={{ color: C.inkSoft }} className="mt-1 mb-2 text-sm">
        Coloque o QuesTAH na tela inicial e ele abre como um app de verdade (em tela cheia e funcionando offline).
      </p>
      {canInstall ? (
        <button onClick={install} style={{ background: C.gold, color: C.ink }}
          className="w-full rounded-xl py-2.5 font-serif font-bold active:scale-95 transition">Instalar agora</button>
      ) : ios ? (
        <div style={{ color: C.inkSoft }} className="text-sm">
          No iPhone/iPad: toque em <b>Compartilhar</b> (o quadradinho com a seta ↑) e depois em <b>Adicionar à Tela de Início</b>.
        </div>
      ) : (
        <div style={{ color: C.inkSoft }} className="text-sm">
          No menu do navegador (⋮), procure por <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. Se não aparecer, recarregue a página e tente de novo.
        </div>
      )}
    </Panel>
  );
}

function AccountPanel({ user }) {
  const supabase = getSupabase();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");
  const hasEmail = !!(user && user.email);

  const link = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const { error } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: window.location.origin }
      );
      if (error) { setStatus("error"); setMsg(error.message); }
      else { setStatus("sent"); }
    } catch (e) {
      setStatus("error"); setMsg("Não foi possível enviar agora. Tente de novo.");
    }
  };

  if (hasEmail) {
    return (
      <Panel>
        <div style={{ color: C.ink }} className="flex items-center gap-2 font-bold"><Mail size={16} /> Conta</div>
        <p style={{ color: C.inkSoft }} className="mt-1 text-sm">Progresso salvo na nuvem em <b>{user.email}</b>. Sincroniza em qualquer aparelho. ✅</p>
      </Panel>
    );
  }

  return (
    <Panel style={{ borderColor: C.gold }}>
      <div style={{ color: C.ink }} className="flex items-center gap-2 font-bold"><Mail size={16} /> Salvar meu progresso</div>
      <p style={{ color: C.inkSoft }} className="mt-1 mb-2 text-sm">
        Você está jogando sem conta — o progresso fica só neste aparelho. Adicione seu e-mail para <b>salvar na nuvem</b> e jogar em qualquer lugar (sem perder nada do que já fez).
      </p>
      {status === "sent" ? (
        <div style={{ color: C.xpDeep }} className="text-sm font-bold">📬 Enviamos um link de confirmação para <b>{email}</b>. Toque nele para concluir.</div>
      ) : (
        <>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
            style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/70 px-3 py-2 outline-none" />
          <button onClick={link} disabled={status === "sending"} style={{ background: C.gold, color: C.ink, opacity: status === "sending" ? 0.6 : 1 }}
            className="w-full rounded-xl py-2 font-bold active:scale-95 transition">{status === "sending" ? "Enviando…" : "Salvar progresso"}</button>
          {status === "error" && <p className="mt-2 text-sm" style={{ color: "#c0392b" }}>{msg}</p>}
        </>
      )}
    </Panel>
  );
}

/* ============================================================
   LÓGICA AUXILIAR
   ============================================================ */
function stageFor(stages, xp) {
  let s = stages[0];
  for (const st of stages) if (xp >= st.xp) s = st;
  return s;
}
function getPlayerClass(counts, total, level) {
  if (total < 8) return "Aventureiro Novato";
  const { pet = 0, casa = 0, pessoal = 0, saude = 0 } = counts;
  const max = Math.max(pet, casa, pessoal, saude), min = Math.min(pet, casa, pessoal, saude);
  if (total >= 60 && max - min <= total * 0.3) return "Herói Lendário";
  const top = [["casa", casa], ["pessoal", pessoal], ["pet", pet], ["saude", saude]].sort((a, b) => b[1] - a[1])[0][0];
  return { casa: "Guardião da Casa", pessoal: "Monge da Disciplina", pet: "Guardião dos Bichos", saude: "Guardião da Saúde" }[top];
}
function checkAchievements(d, level) {
  const snap = { tasksCompleted: d.tasksCompleted, level: levelFromXp(d.xpTotal).level, xpTotal: d.xpTotal, longestStreak: d.longestStreak, catCounts: d.catCounts, taskCounts: d.taskCounts, medDaysTotal: d.medDaysTotal };
  const list = [...(d.achievements || [])];
  const unlocked = [];
  for (const a of ACHIEVEMENTS) if (!list.includes(a.id) && a.check(snap)) { list.push(a.id); unlocked.push(a.id); }
  return { list, unlocked };
}
function checkBosses(d) {
  for (const b of BOSSES) {
    if (d.bossesDefeated.includes(b.id)) continue;
    const cur = b.metric === "medStreak" ? d.medStreak : d.tasksCompleted;
    if (cur >= b.goal) return b;
  }
  return null;
}

/* ---------- keyframes injetadas ---------- */
function Keyframes() {
  return (
    <style>{`
      @keyframes floatUp { 0%{opacity:0; transform:translate(-50%,10px) scale(.7)} 20%{opacity:1} 100%{opacity:0; transform:translate(-50%,-70px) scale(1.15)} }
      @keyframes burst { 0%{opacity:1; transform:translate(0,0) scale(1)} 100%{opacity:0; transform:translate(var(--tx),var(--ty)) scale(.3)} }
      @keyframes popIn { 0%{transform:scale(0)} 60%{transform:scale(1.12)} 100%{transform:scale(1)} }
      @keyframes wiggle { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes monbob { 0%,49%{transform:translateY(0)} 50%,100%{transform:translateY(-7%)} }
      @media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms!important} }
    `}</style>
  );
}
