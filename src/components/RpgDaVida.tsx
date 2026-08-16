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
  Sword, Store, Heart, BarChart3, Crown, Flame, Map,
  Plus, Minus, Trash2, X, Target, Zap, Volume2, VolumeX, Coins, Check,
  Trophy, Skull, Droplet, Pill, Sun, Moon, Utensils, LogOut, Pencil,
  Gem, PawPrint, Smile, Mail, Bell,
} from "lucide-react";

/* ============================================================
   QuesTAH — Habit Tracker gamificado para mentes com TDAH
   Single-file React app. O save é um único JSON por usuário,
   persistido na nuvem (Supabase, tabela `saves`) via lib/save.ts,
   com debounce. Cada "tabela" do jogo é uma chave do objeto `data`.
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

/* ---------- Categorias ----------
   As categorias são DADO (data.categories), não constante. `CATS` sobrevive
   apenas como fonte da migração de saves antigos — nenhuma tela lê daqui.
   Formato de cada categoria:
   { id, nome, emoji, cor, ordem, ativa, sistema: 'pet' | 'saude' | null }
   Categorias de sistema são renomeáveis/recoloríveis/reordenáveis, mas nunca
   desativadas nem apagadas: elas alimentam o monstrinho e a aba Saúde.        */
const CATS = {
  pet: { label: "Mona", emoji: "🐾", color: C.rose },
  casa: { label: "Casa", emoji: "🏠", color: C.sky },
  pessoal: { label: "Pessoal", emoji: "🎒", color: C.gold },
  trabalho: { label: "Trabalho", emoji: "💼", color: "#8a6bd1" },
  saude: { label: "Saúde", emoji: "💙", color: "#34b3a0" },
};
const LEGACY_CAT_ORDER = ["pet", "casa", "pessoal", "trabalho", "saude"];
const CAT_SISTEMA = { pet: "pet", saude: "saude" };
const MAX_ACTIVE_CATS = 8;

/** Categorias de um save antigo: preserva exatamente o que o usuário já via. */
function legacyCategories() {
  return LEGACY_CAT_ORDER.map((id, i) => ({
    id, nome: CATS[id].label, emoji: CATS[id].emoji, cor: CATS[id].color,
    ordem: i, ativa: true, sistema: CAT_SISTEMA[id] || null,
  }));
}
/** Categorias de um usuário novo: genéricas, sem referências pessoais. */
function freshCategories() {
  return [
    { id: "pet", nome: "Pet", emoji: "🐾", cor: C.rose, ordem: 0, ativa: true, sistema: "pet" },
    { id: "casa", nome: "Casa", emoji: "🏠", cor: C.sky, ordem: 1, ativa: true, sistema: null },
    { id: "pessoal", nome: "Pessoal", emoji: "🌱", cor: C.gold, ordem: 2, ativa: true, sistema: null },
    { id: "trabalho", nome: "Trabalho", emoji: "💼", cor: "#8a6bd1", ordem: 3, ativa: true, sistema: null },
    { id: "saude", nome: "Saúde", emoji: "❤️", cor: "#34b3a0", ordem: 4, ativa: true, sistema: "saude" },
  ];
}

/* ---------- Helpers de categoria (únicos pontos de leitura) ---------- */
const CAT_FALLBACK = { nome: "Aventura", emoji: "⚔️", cor: C.gold, ordem: 999, ativa: true, sistema: null };
function categoriesOf(data) {
  return Array.isArray(data?.categories) ? data.categories : [];
}
/** Categoria crua, ou null se o id não existir. */
function getCategory(data, id) {
  return categoriesOf(data).find((c) => c.id === id) || null;
}
/** Sempre devolve algo renderizável — nunca quebra com id desconhecido. */
function catView(data, id) {
  return getCategory(data, id) || { ...CAT_FALLBACK, id: id || "outros" };
}
function sortedCategories(data) {
  return [...categoriesOf(data)].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}
function activeCategories(data) {
  return sortedCategories(data).filter((c) => c.ativa);
}
/** Id da categoria que carrega um comportamento especial ('pet' | 'saude'). */
function systemCategoryId(data, sistema) {
  return categoriesOf(data).find((c) => c.sistema === sistema)?.id || sistema;
}
/** Uma categoria inativa deixa de ser oferecida, mas nunca esconde o histórico. */
function isCategoryOffered(data, id) {
  const c = getCategory(data, id);
  return c ? !!c.ativa : true; // id desconhecido: mostra, nunca some em silêncio
}

/* ---------- Ícones e cores das missões ---------- */
const TASK_ICONS = [
  "⚔️","🛡️","🔥","✨","🎯","📦","🧹","🧼","🚿","🛁","🍽️","🍳","☕","🥤","💧","🍎",
  "💊","🩺","🏃","🧘","😴","🛏️","🦷","🚮","🗑️","🔑","👛","📱","💡","🚰","🪟","❄️",
  "🐾","🐱","🐶","🍖","🧶","📚","💻","✍️","📞","🧺","👕","🛒","🌱","🎵","🎮","💛",
];
const TASK_COLORS = ["#c94f5e", "#e8843a", "#e8b339", "#57a05a", "#34b3a0", "#4b8fd6", "#8a6bd1", "#6d5643"];
const DEFAULT_TASK_ICON = {
  comida_mona: "🍖", agua_mona: "💧", areia: "🧹", brincar_mona: "🧶", guarda_roupa: "🐱",
  torneiras: "🚰", filtro: "🥤", luzes: "💡", janela: "🪟", geladeira: "❄️", lixo: "🗑️",
  chave: "🔑", carteira: "👛", celular: "📱",
};
function taskIcon(t, data) {
  return t?.icon || DEFAULT_TASK_ICON[t?.key] || catView(data, t?.category).emoji || "⚔️";
}
function taskColor(t, data) {
  return t?.color || catView(data, t?.category).cor || C.gold;
}

/* ---------- Dificuldade (declarada, nunca inferida do XP) ---------- */
const DIFICULDADES = [
  { id: "rapida", label: "Rápida", emoji: "⚡", hint: "~2 min", xpSug: [3, 5], selo: "⚡ rápida" },
  { id: "normal", label: "Normal", emoji: "⚔️", hint: "do dia a dia", xpSug: [10, 15], selo: null },
  { id: "epica", label: "Épica", emoji: "🔥", hint: "exige fôlego", xpSug: [20, 30], selo: "🔥 épica" },
];
const dificuldadeOf = (t) => (DIFICULDADES.some((d) => d.id === t?.dificuldade) ? t.dificuldade : "normal");
const dificuldadeInfo = (t) => DIFICULDADES.find((d) => d.id === dificuldadeOf(t)) || DIFICULDADES[1];
/** Regra de migração: preserva exatamente o comportamento do save atual,
 *  onde "rápida" era qualquer missão de até 5 XP. */
const dificuldadeFromXp = (xp) => ((xp || 0) <= 5 ? "rapida" : "normal");

/* ---------- Recorrência ----------
   { tipo: 'sempre' }
   { tipo: 'dias_semana', dias: number[] }
   { tipo: 'a_cada_n_dias', n, ancora: 'YYYY-MM-DD' }
   { tipo: 'unica', data: 'YYYY-MM-DD' }                                   */
const RECORRENCIA_TIPOS = [
  { id: "sempre", label: "Todo dia", emoji: "🔁" },
  { id: "dias_semana", label: "Dias da semana", emoji: "📅" },
  { id: "a_cada_n_dias", label: "A cada N dias", emoji: "⏳" },
  { id: "unica", label: "Só uma vez", emoji: "🎯" },
];
/** Lê a recorrência da missão, derivando do `days` legado quando preciso. */
function recorrenciaOf(t) {
  const r = t?.recorrencia;
  if (r && typeof r === "object" && r.tipo) return r;
  const dias = t?.days;
  if (Array.isArray(dias) && dias.length && dias.length < 7) return { tipo: "dias_semana", dias };
  return { tipo: "sempre" };
}
function recorrenciaLabel(t) {
  const r = recorrenciaOf(t);
  if (r.tipo === "a_cada_n_dias") return `a cada ${r.n} dia${r.n > 1 ? "s" : ""}`;
  if (r.tipo === "unica") return `só em ${(r.data || "").split("-").reverse().slice(0, 2).join("/")}`;
  if (r.tipo === "dias_semana") {
    const N = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    return (r.dias || []).map((d) => N[d]).join(", ");
  }
  return "todo dia";
}

/** Garante `dificuldade` e `recorrencia` na missão, sem alterar comportamento. */
function normalizeTask(t) {
  const out = { ...t };
  if (!DIFICULDADES.some((x) => x.id === out.dificuldade)) out.dificuldade = dificuldadeFromXp(out.xp);
  if (!out.recorrencia || !out.recorrencia.tipo) out.recorrencia = recorrenciaOf(t);
  return out;
}

/* ---------- Pular sem culpa: o Mestre nunca cobra ---------- */
const SKIP_MSGS = [
  "Até heróis recuam para atacar melhor amanhã.",
  "Missão adiada não é missão perdida.",
  "O mapa continua aí. Volte quando quiser.",
  "Descansar também faz parte da jornada. 💛",
];

/* ---------- Tarefas iniciais (só para usuários novos) ----------
   Textos genéricos de propósito: as missões de um save existente são dado
   do usuário e nunca são reescritas por aqui. As `key` são preservadas
   porque conquistas e contadores dependem delas.                            */
const BASE_TASKS = [
  { id: "t_comida", key: "comida_mona", name: "Colocar comida para o pet", desc: "Encha o potinho", xp: 10, category: "pet", need: "hunger", icon: "🍖" },
  { id: "t_agua", key: "agua_mona", name: "Água fresca para o pet", desc: "Troque a água do pote", xp: 5, category: "pet", need: "thirst", icon: "💧" },
  { id: "t_areia", key: "areia", name: "Limpar o espaço do pet", desc: "Caixa de areia ou cantinho em ordem", xp: 10, category: "pet", need: "hygiene", icon: "🧹" },
  { id: "t_brincar", key: "brincar_mona", name: "Brincar com o pet", desc: "Um tempinho de carinho e brincadeira", xp: 10, category: "pet", need: "fun", icon: "🧶" },
  { id: "t_guarda", key: "guarda_roupa", name: "Pet em segurança", desc: "Confira os cantinhos antes de fechar", xp: 10, category: "pet", icon: "🐱" },
  { id: "t_torneira", key: "torneiras", name: "Torneiras fechadas", desc: "Cozinha e banheiro", xp: 5, category: "casa", icon: "🚰" },
  { id: "t_filtro", key: "filtro", name: "Filtro fechado", desc: "Sem desperdício", xp: 5, category: "casa", icon: "🥤" },
  { id: "t_luzes", key: "luzes", name: "Luzes desligadas", desc: "Economia ligada", xp: 5, category: "casa", icon: "💡" },
  { id: "t_janela", key: "janela", name: "Janela fechada", desc: "Casa segura", xp: 5, category: "casa", icon: "🪟" },
  { id: "t_geladeira", key: "geladeira", name: "Geladeira fechada", desc: "Porta bem encostada", xp: 5, category: "casa", icon: "❄️" },
  { id: "t_lixo", key: "lixo", name: "Lixo para fora", desc: "Nos dias de coleta", xp: 15, category: "casa", icon: "🗑️" },
  { id: "t_chave", key: "chave", name: "Pegou a chave", desc: "Antes de sair", xp: 5, category: "pessoal", icon: "🔑" },
  { id: "t_carteira", key: "carteira", name: "Pegou a carteira", desc: "Antes de sair", xp: 5, category: "pessoal", icon: "👛" },
  { id: "t_celular", key: "celular", name: "Pegou o celular", desc: "Antes de sair", xp: 5, category: "pessoal", icon: "📱" },
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
  { id: "mona_master", name: "Melhor Amigo", emoji: "🐱", desc: "Cuide do seu pet 20 vezes", check: (s) => (s.catCounts.pet || 0) >= 20 },
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
  { name: "Aprendiz da Ordem", xp: 300, emoji: "🧹" },
  { name: "Guardião da Jornada", xp: 900, emoji: "🛡️" },
  { name: "Mestre da Rotina", xp: 2000, emoji: "⚔️" },
  { name: "Lenda Viva", xp: 4000, emoji: "🏰" },
];

/* ---------- Pet (genérico) ---------- */
const PET_STAGES = [
  { name: "Filhote Sonolento", xp: 0 },
  { name: "Explorador", xp: 200 },
  { name: "Caçador", xp: 600 },
  { name: "Realeza da Casa", xp: 1500 },
  { name: "Companheiro Lendário", xp: 3500 },
];
const DEFAULT_PET = { name: "Monstrinho", species: "gato", color: "#ffffff" };

/* ---------- Ilustrações do herói (imagens reais) ---------- */
const AVATAR_IMG = { normal: "/avatar/normal.png", supremo: "/avatar/supremo.png" };
const AVATAR_SUPREMO_LEVEL = 10;
// Config do avatar guardada no save. O construtor em camadas (cabelo, roupa,
// acessórios) mora em legacy/avatar-builder.tsx — volta na Fase 5.
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
  trabalho: ["Missão de trabalho concluída 💼", "Produtividade em alta, herói", "Mais uma pendência derrotada"],
  saude: ["Seu corpo agradece o cuidado 💙", "Buff de vitalidade ativado", "Mais um passo pela sua saúde"],
  // usado por qualquer categoria criada pelo usuário
  generic: [
    "O Caos recuou um passo",
    "Mais uma missão riscada do pergaminho",
    "Sua lenda ficou um pouco maior ✨",
    "Golpe certeiro na procrastinação",
    "Herói em movimento — continue assim",
  ],
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
/** Meio-dia local, para diferenças de dias imunes a horário de verão. */
const noonOf = (key) => new Date(`${key}T12:00:00`);
const daysBetween = (aKey, bKey) => Math.round((noonOf(bKey) - noonOf(aKey)) / 86400000);

/** A missão vale para este dia? Entende os 4 tipos de recorrência.
 *  `ref` é a data de referência (default: hoje) — usada também no reset diário
 *  para avaliar o dia que está fechando. */
function isActiveOn(t, refKey = dayKey()) {
  const r = recorrenciaOf(t);
  if (r.tipo === "sempre") return true;
  if (r.tipo === "dias_semana") {
    const dias = Array.isArray(r.dias) ? r.dias : [];
    return dias.length ? dias.includes(noonOf(refKey).getDay()) : true;
  }
  if (r.tipo === "unica") return r.data === refKey;
  if (r.tipo === "a_cada_n_dias") {
    const n = Math.max(1, Number(r.n) || 1);
    const ancora = r.ancora || refKey;
    const diff = daysBetween(ancora, refKey);
    return diff >= 0 && diff % n === 0;
  }
  return true;
}
const isActiveToday = (t) => isActiveOn(t);
/** Missão única já concluída alguma vez não volta; a de data passada some sem punir. */
function isRetired(t, data) {
  const r = recorrenciaOf(t);
  if (r.tipo !== "unica") return false;
  if ((data?.completedOnce || []).includes(t.id)) return true;
  return !!r.data && daysBetween(r.data, dayKey()) > 0;
}
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
  skippedToday: { date: dayKey(), ids: [] }, // puladas hoje (sem culpa, sem punição)
  skipsTotal: 0,        // contador interno; de propósito não vira tela
  completedOnce: [],    // ids de missões únicas já concluídas (não voltam)
  lastResetDate: dayKey(),
  tasks: null,      // semeado em freshData()/migração
  categories: null, // semeado em freshData()/migração
  meds: [],      // remédios do usuário (manhã/noite)
  meals: null,   // refeições nomeadas (semeado)
  rewards: DEFAULT_REWARDS,
  purchases: [],
  tasksCompleted: 0,
  catCounts: { pet: 0, casa: 0, pessoal: 0, trabalho: 0, saude: 0 },
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
  gbMode: false,
};

/** Estado novo com missões e refeições já semeadas. */
function freshData() {
  return {
    ...DEFAULT_DATA,
    scoredToday: { date: dayKey(), ids: [] },
    skippedToday: { date: dayKey(), ids: [] },
    completedOnce: [],
    water: { date: dayKey(), count: 0 },
    waterScored: { date: dayKey(), cups: 0 },
    tasks: BASE_TASKS.map((t) => ({ ...t })),
    categories: freshCategories(),
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
  const [tab, setTab] = useState("vila");
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
        // Categorias viram dado. Um save anterior à Fase 1 recebe exatamente as
        // 5 categorias que ele já via (labels antigos inclusive), reusando as
        // chaves como id — assim nenhuma missão precisa ser reescrita.
        if (!Array.isArray(loaded.categories)) d.categories = legacyCategories();
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
            const brincar = { id: "t_brincar", key: "brincar_mona", name: "Brincar com o pet", desc: "Um tempinho de carinho e brincadeira", xp: 10, category: "pet", need: "fun" };
            if (idx >= 0) d.tasks.splice(idx + 1, 0, brincar); else d.tasks.push(brincar);
          }
        }
        if (typeof d.hardMode !== "boolean") d.hardMode = false;
        if (typeof d.gameBest !== "number") d.gameBest = 0;
      }
      delete d.customTasks; delete d.customMeds;

      // rede de segurança: o app nunca roda sem categorias, e as de sistema
      // (pet/saude) são sempre ativas — elas sustentam o monstrinho e a Saúde.
      if (!Array.isArray(d.categories) || !d.categories.length) d.categories = freshCategories();
      d.categories = d.categories.map((c, i) => ({
        ...c,
        ordem: typeof c.ordem === "number" ? c.ordem : i,
        ativa: c.sistema ? true : c.ativa !== false,
      }));

      // ---- Fase 2: dificuldade e recorrência viram campos explícitos ----
      // A regra de migração reproduz o comportamento que o save já tinha:
      // "rápida" era toda missão de até 5 XP, e `days` virava dias da semana.
      // `t.days` é preservado por retrocompatibilidade; as leituras usam
      // `recorrencia`.
      if (Array.isArray(d.tasks)) d.tasks = d.tasks.map(normalizeTask);
      if (Array.isArray(d.meds)) d.meds = d.meds.map((m) => ({ ...m, dificuldade: m.dificuldade || "rapida" }));
      if (Array.isArray(d.meals)) d.meals = d.meals.map((m) => ({ ...m, dificuldade: m.dificuldade || "rapida" }));
      if (!d.skippedToday || d.skippedToday.date !== dayKey()) d.skippedToday = { date: dayKey(), ids: [] };
      if (typeof d.skipsTotal !== "number") d.skipsTotal = 0;
      if (!Array.isArray(d.completedOnce)) d.completedOnce = [];

      // reset diário
      const today = dayKey();
      if (d.lastResetDate !== today) {
        // Modo Difícil: penaliza missões não feitas no dia que está fechando.
        // Quem pulou conscientemente NUNCA é punido por isso.
        if (d.hardMode && d.lastResetDate) {
          const skippedIds = (d.skippedToday && d.skippedToday.date === d.lastResetDate) ? d.skippedToday.ids : [];
          const prevActive = (d.tasks || []).filter((t) => isActiveOn(t, d.lastResetDate));
          const missed = prevActive.filter((t) => !d.doneToday.includes(t.id) && !skippedIds.includes(t.id));
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
        d.skippedToday = { date: today, ids: [] };
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
  const playerClass = getPlayerClass(data, level);
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
          // missão "só uma vez" concluída não volta mais
          if (recorrenciaOf(task).tipo === "unica" && !(d.completedOnce || []).includes(task.id)) {
            d.completedOnce = [...(d.completedOnce || []), task.id];
          }
          d.catCounts = { ...d.catCounts, [task.category]: (d.catCounts[task.category] || 0) + 1 };
          if (task.key) d.taskCounts = { ...d.taskCounts, [task.key]: (d.taskCounts[task.key] || 0) + 1 };

          markActive(d);
          bumpEnergy(d, ENERGY_RECOVER_TASK);
          d.hardPenaltyNote = null;

          // Tamagotchi: cuidar do pet real enche os medidores do pet virtual.
          // O vínculo com a categoria é por `sistema`, não por nome/id fixo.
          const isPetTask = getCategory(d, task.category)?.sistema === "pet";
          settleTama(d);
          if (task.need) d.tama[task.need] = 100;
          if (isPetTask) d.tama.fun = cl100(d.tama.fun + 12);
          if (d.tama.hunger > 20 && d.tama.thirst > 20 && d.tama.hygiene > 20) d.tama.sick = false;
          // vínculo (evolução por bom cuidado)
          if (isPetTask) gainBond(d, 8);
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

          const color = catView(d, task.category).cor;
          spawnPop(`+${task.xp} XP`, color);
          spawnParticles(color);
          const arr = FUN_MSGS[task.category] || FUN_MSGS.generic;
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
          // o "dia completo" ignora puladas e missões já aposentadas
          const skippedNow = (d.skippedToday && d.skippedToday.date === today) ? d.skippedToday.ids : [];
          const todays = (d.tasks || []).filter(
            (x) => isActiveToday(x) && !isRetired(x, d) && !skippedNow.includes(x.id)
          );
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

  /* ---------- pular / despular (sem culpa, sem punição) ----------
     Pular tira a missão do dia, não dá XP, não conta para a streak e não
     entra na penalidade do Modo Difícil. Ela volta na próxima ocorrência. */
  const toggleSkip = (task) => {
    const today = dayKey();
    const cur = (data.skippedToday && data.skippedToday.date === today) ? data.skippedToday.ids : [];
    const isSkipped = cur.includes(task.id);
    setData((prev) => {
      const d = { ...prev };
      const list = (d.skippedToday && d.skippedToday.date === today) ? d.skippedToday.ids : [];
      if (isSkipped) {
        d.skippedToday = { date: today, ids: list.filter((id) => id !== task.id) };
      } else {
        d.skippedToday = { date: today, ids: [...list, task.id] };
        d.skipsTotal = (d.skipsTotal || 0) + 1;
        // desmarcar se estava concluída não devolve XP (mesma regra do desfazer)
        d.doneToday = d.doneToday.filter((id) => id !== task.id);
      }
      return d;
    });
    if (!isSkipped) showToast(SKIP_MSGS[Math.floor(Math.random() * SKIP_MSGS.length)]);
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
          const hColor = catView(d, systemCategoryId(d, "saude")).cor;
          spawnPop(`+${WATER_XP} XP`, hColor); spawnParticles(hColor);
        }
      }
      return d;
    });
  };

  /* ---------- tarefas pendentes para Modo Foco / Rápida ---------- */
  // Missão de categoria desativada deixa de ser oferecida, mas continua visível
  // no dia se já foi marcada — o histórico do usuário nunca some sem aviso.
  const skippedIds = (data.skippedToday && data.skippedToday.date === dayKey()) ? data.skippedToday.ids : [];
  const dayTasks = allTasks.filter(
    (t) => isActiveToday(t) && !isRetired(t, data)
      && (isCategoryOffered(data, t.category) || data.doneToday.includes(t.id))
  );
  // as puladas saem do dia, mas continuam acessíveis num grupo próprio
  const todayTasks = dayTasks.filter((t) => !skippedIds.includes(t.id));
  const skippedTasks = dayTasks.filter((t) => skippedIds.includes(t.id));
  const visibleTasks = todayTasks.filter((t) => (quickOnly ? dificuldadeOf(t) === "rapida" : true));
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
        <FocusOverlay data={data} pending={pending} onClose={() => setFocusMode(false)} onDone={toggleTask} onSkip={toggleSkip} />
      )}

      {/* conteúdo */}
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <InstallHint />
        {tab === "vila" && <VillageMap go={setTab} />}
        {tab === "aventura" && (
          data.gbMode
            ? <GameBoyHome data={data} level={level} xpInLevel={xpInLevel} xpForNext={xpForNext} pct={pct}
                playerClass={playerClass} tama={tama} tasks={todayTasks} toggleTask={toggleTask}
                exit={() => update({ gbMode: false })} />
            : <Aventura {...{ data, level, xpInLevel, xpForNext, pct, playerClass, petStage, journeyStage,
                visibleTasks, skippedTasks, quickOnly, setQuickOnly, toggleTask, toggleSkip, setFocusMode,
                pending, allTasks: todayTasks, update, openGame: () => setShowGame(true) }} />
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
            { k: "vila", icon: Map, label: "Vila" },
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

/* ---------- VILA (mapa inicial) ---------- */
function VillageMap({ go }) {
  const spots = [
    { tab: "aventura", label: "Missões", left: 15, top: 10, w: 21, h: 15 },
    { tab: "loja", label: "Loja", left: 57, top: 7, w: 29, h: 22 },
    { tab: "pet", label: "Monstro", left: 9, top: 32, w: 25, h: 21 },
    { tab: "saude", label: "Boticário", left: 67, top: 33, w: 27, h: 20 },
    { tab: "stats", label: "Torre do Mago", left: 20, top: 65, w: 25, h: 28 },
  ];
  return (
    <div>
      <div className="font-pixel mb-2 text-center" style={{ color: C.gold, fontSize: 13, textShadow: "1px 1px 0 rgba(0,0,0,.5)" }}>VILA DO HEROI</div>
      <div style={{ position: "relative", width: "100%" }}>
        <img src="/vila.jpg" alt="Vila do Herói" style={{ width: "100%", display: "block", borderRadius: 12, border: `3px solid ${C.goldDeep}` }} />
        {spots.map((s) => (
          <button key={s.tab} onClick={() => go(s.tab)} aria-label={s.label}
            style={{ position: "absolute", left: `${s.left}%`, top: `${s.top}%`, width: `${s.w}%`, height: `${s.h}%` }}
            className="active:scale-95 transition">
            <span className="font-pixel" style={{ position: "absolute", left: "50%", bottom: "-12px", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 7, color: "#fff", background: "rgba(20,16,32,.85)", padding: "2px 4px", borderRadius: 3 }}>{s.label}</span>
          </button>
        ))}
        <button onClick={() => go("stats")} aria-label="Mestre"
          style={{ position: "absolute", left: "45%", top: "79%", width: "12%" }} className="active:scale-95 transition">
          {/* a arte do Mestre é opcional: se o arquivo não existir, some sem
              quebrar o layout — o hotspot continua clicável */}
          <img src="/mestre_azul.png" alt="Mestre" className="imgpx"
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
            style={{ width: "100%", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }} />
        </button>
      </div>
      <div className="font-pixel mt-3 text-center" style={{ color: C.inkSoft, fontSize: 8 }}>Toque num predio pra entrar</div>
    </div>
  );
}

/* ---------- MODO GAME BOY (skin retrô da tela principal) ---------- */
const GB = {
  screen: "#c4cfa1", panel: "#eef2cf", ink: "#20301a", dim: "#5c6b3a",
  gold: "#b9852a", red: "#b23a2a", green: "#4a8c3a",
};
const noac = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const CAT_MSG = {
  pet: ["Seu bichinho esta orgulhoso!", "Voce cuidou bem do seu pet!"],
  casa: ["Monstro da Pia Aberta derrotado!", "Casa protegida com sucesso!", "Geladeira selada!"],
  pessoal: ["Item essencial garantido!", "Heroi preparado pra aventura!"],
  trabalho: ["Tarefa de trabalho concluida!", "Produtividade ativada!"],
  saude: ["Sua saude agradece!", "Buff de vida ativado!"],
  generic: ["Missao concluida!", "O Caos recuou um passo!", "Sua lenda cresceu!"],
};
function GBBox({ children, style, className = "" }) {
  return (
    <div style={{ background: GB.panel, border: `3px solid ${GB.ink}`, boxShadow: `inset 0 0 0 3px ${GB.panel}, inset 0 0 0 5px ${GB.ink}`, borderRadius: 6, ...style }}
      className={`p-4 ${className}`}>{children}</div>
  );
}
function GameBoyHome({ data, level, xpInLevel, xpForNext, pct, playerClass, tama, tasks, toggleTask, exit }) {
  const [dialog, setDialog] = useState({ title: "BEM-VINDO, HEROI!", body: "Toque numa missao pra comecar a aventura." });
  const isDone = (id) => data.doneToday.includes(id);
  const pendingFirst = tasks.find((t) => !isDone(t.id));
  const handle = (t) => {
    const already = isDone(t.id);
    toggleTask(t);
    if (!already) {
      const pool = CAT_MSG[t.category] || CAT_MSG.generic;
      setDialog({ title: `+${t.xp} XP   +${t.xp} OURO`, body: pool[Math.floor(Math.random() * pool.length)] });
    }
  };
  return (
    <div className="font-pixel" style={{ color: GB.ink }}>
      <div className="mb-2 flex items-center justify-between">
        <span style={{ fontSize: 9, color: GB.dim }}>MODO GAME BOY</span>
        <button onClick={exit} style={{ fontSize: 9, color: GB.ink, background: GB.panel, border: `2px solid ${GB.ink}` }} className="rounded px-2 py-1 active:opacity-70">SAIR X</button>
      </div>

      <GBBox className="mb-3">
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>{noac(data.playerName || "HEROI").toUpperCase()}</div>
        <div style={{ fontSize: 8, color: GB.dim }} className="mt-1">{noac(playerClass || "AVENTUREIRO").toUpperCase()}</div>
        <div className="mt-3 flex items-center gap-2" style={{ fontSize: 10 }}>
          <span>Lv{level}</span>
          <div style={{ flex: 1, height: 12, border: `2px solid ${GB.ink}`, background: GB.screen }}>
            <div style={{ width: `${pct}%`, height: "100%", background: GB.green }} />
          </div>
        </div>
        <div className="mt-2 flex justify-between" style={{ fontSize: 8, color: GB.dim }}>
          <span>XP {xpInLevel}/{xpForNext}</span>
          <span>OURO {data.gold}  GEM {data.gems}  {data.currentStreak}d</span>
        </div>
      </GBBox>

      <GBBox className="mb-3" style={{ textAlign: "center" }}>
        {tama && tama.type ? (
          <>
            <img src={monSrc(tama.type, tama.stage)} alt="mon" className="imgpx" style={{ width: 92, height: 92, margin: "0 auto", animation: "monbob 0.9s steps(1) infinite" }} />
            <div style={{ fontSize: 9 }} className="mt-1">{noac(data.pet?.name || "MONSTRO").toUpperCase()} - {noac(MON_STAGES[tama.stage]).toUpperCase()}</div>
          </>
        ) : (
          <div style={{ fontSize: 9, color: GB.dim }} className="py-6">Escolha seu ovo na aba PET</div>
        )}
      </GBBox>

      <GBBox className="mb-3">
        <div style={{ fontSize: 9 }} className="mb-3">- MISSOES DE HOJE -</div>
        <div className="space-y-2">
          {tasks.length === 0 && <div style={{ fontSize: 9, color: GB.dim }}>Sem missoes hoje. Descanse, heroi!</div>}
          {tasks.map((t) => {
            const d = isDone(t.id);
            const cur = !d && t === pendingFirst;
            return (
              <button key={t.id} onClick={() => handle(t)} className="flex w-full items-center justify-between text-left active:opacity-60"
                style={{ fontSize: 10, lineHeight: 1.5, color: d ? GB.dim : GB.ink }}>
                <span style={{ textDecoration: d ? "line-through" : "none" }}>{cur ? "\u25B6" : "\u00A0\u00A0"} {d ? "[X]" : "[ ]"} {noac(t.name)}</span>
                <span style={{ color: GB.gold, marginLeft: 8, whiteSpace: "nowrap" }}>+{t.xp}</span>
              </button>
            );
          })}
        </div>
      </GBBox>

      <GBBox>
        <div style={{ fontSize: 11 }}>{dialog.title}</div>
        <div style={{ fontSize: 9, color: GB.dim, lineHeight: 1.6 }} className="mt-2">{noac(dialog.body)} {"\u25BC"}</div>
      </GBBox>
    </div>
  );
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
  visibleTasks, skippedTasks = [], quickOnly, setQuickOnly, toggleTask, toggleSkip, setFocusMode,
  pending, allTasks, update, openGame }) {
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCats, setShowCats] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const tasks = data.tasks || [];
  // Agrupamento dinâmico: segue a ordem escolhida pelo usuário. Categorias
  // desconhecidas caem num grupo de fallback em vez de quebrar a tela.
  // ATENÇÃO: `Map` aqui é o ÍCONE do lucide-react (importado no topo), não o
  // Map nativo — usar `new Map()` neste arquivo quebra em runtime. Agrupamos
  // com um objeto simples de propósito.
  const byCat = {};
  visibleTasks.forEach((t) => {
    const k = t.category || "outros";
    (byCat[k] || (byCat[k] = [])).push(t);
  });
  const known = sortedCategories(data).filter((c) => byCat[c.id]);
  const unknown = Object.keys(byCat).filter((k) => !getCategory(data, k));
  const groups = [
    ...known.map((c) => ({ cat: c, list: byCat[c.id] })),
    ...unknown.map((k) => ({ cat: catView(data, k), list: byCat[k] })),
  ];
  // Missões que hoje não estão na lista (outra recorrência, categoria inativa,
  // única já concluída ou vencida) continuam acessíveis no modo Editar —
  // some da rotina do dia, nunca do controle do usuário.
  const shown = {};
  visibleTasks.forEach((t) => { shown[t.id] = true; });
  skippedTasks.forEach((t) => { shown[t.id] = true; });
  const outOfDay = editMode ? tasks.filter((t) => !shown[t.id]) : [];
  const doneCount = allTasks.filter((t) => data.doneToday.includes(t.id)).length;

  const saveTask = (task) => {
    const exists = tasks.find((t) => t.id === task.id);
    update({ tasks: exists ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task] });
    setAdding(false); setEditingTask(null);
  };
  const removeTask = (id) => update({
    tasks: tasks.filter((t) => t.id !== id),
    doneToday: data.doneToday.filter((x) => x !== id),
    skippedToday: { date: dayKey(), ids: ((data.skippedToday || {}).ids || []).filter((x) => x !== id) },
  });

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
          <button onClick={() => { setShowCats((s) => !s); setEditMode(false); setEditingTask(null); setAdding(false); }}
            style={{ color: showCats ? C.gold : C.parch2 }} className="flex items-center gap-1 text-xs font-bold">
            ⚙️ Reinos
          </button>
          <button onClick={() => { setEditMode((e) => !e); setEditingTask(null); setAdding(false); setShowCats(false); }}
            style={{ color: editMode ? C.gold : C.parch2 }} className="flex items-center gap-1 text-xs font-bold">
            <Pencil size={14} /> {editMode ? "Pronto" : "Editar"}
          </button>
        </span>
      </div>

      {showCats && <CategoryManager data={data} update={update} onClose={() => setShowCats(false)} />}

      {(adding || editingTask) && (
        <TaskForm data={data} initial={editingTask} onCancel={() => { setAdding(false); setEditingTask(null); }} onSave={saveTask} />
      )}

      {groups.map(({ cat, list }) => list.length > 0 && (
        <div key={cat.id} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">{cat.emoji}</span>
            <span style={{ color: C.parch }} className="font-serif font-bold">{cat.nome}</span>
            {cat.ativa === false && <span style={{ color: C.parch2 }} className="text-[10px] font-bold">(inativa)</span>}
          </div>
          {list.map((t) => {
            const done = data.doneToday.includes(t.id);
            return (
              <div key={t.id} className="flex items-center gap-2">
                <button onClick={() => (editMode ? setEditingTask(t) : toggleTask(t))}
                  style={{ background: done ? "rgba(244,230,197,.45)" : C.parch, border: `3px solid ${done ? C.xpDeep : C.goldDeep}`, borderLeft: `7px solid ${taskColor(t, data)}`, boxShadow: done ? "none" : "0 4px 0 rgba(0,0,0,.2)" }}
                  className="flex flex-1 items-center gap-2.5 rounded-2xl p-3 text-left active:scale-[.98] transition">
                  <span style={{ background: done ? C.xp : "transparent", border: `2px solid ${done ? C.xpDeep : C.inkSoft}`, color: "#fff" }}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
                    {editMode ? <Pencil size={14} style={{ color: C.inkSoft }} /> : (done && <Check size={18} strokeWidth={3} />)}
                  </span>
                  <span style={{ background: taskColor(t, data) + "2e", opacity: done && !editMode ? 0.5 : 1 }}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg">{taskIcon(t, data)}</span>
                  <span className="min-w-0 flex-1">
                    <span style={{ color: C.ink, textDecoration: done && !editMode ? "line-through" : "none", opacity: done && !editMode ? 0.6 : 1 }}
                      className="block font-bold leading-tight">{t.name}</span>
                    <span style={{ color: C.inkSoft }} className="block text-xs">{t.desc}</span>
                  </span>
                  <span className="flex flex-shrink-0 flex-col items-end gap-1">
                    <Tag color={C.xpDeep}>+{t.xp} XP</Tag>
                    {dificuldadeInfo(t).selo && (
                      <span style={{ color: C.inkSoft }} className="text-[9px] font-bold">{dificuldadeInfo(t).selo}</span>
                    )}
                  </span>
                </button>
                {editMode ? (
                  <button onClick={() => removeTask(t.id)} style={{ color: C.ember }} className="p-1 active:scale-90 transition"><Trash2 size={16} /></button>
                ) : (
                  // ação secundária, discreta de propósito: nunca compete com o check
                  <button onClick={() => toggleSkip(t)} title="Pular hoje, sem culpa" aria-label={`Pular ${t.name} hoje`}
                    style={{ color: C.parch2 }} className="p-1 text-sm opacity-70 active:scale-90 transition">↷</button>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* fora do dia — só no modo Editar, para nada ficar inacessível */}
      {editMode && outOfDay.length > 0 && (
        <div className="space-y-2">
          <div style={{ color: C.parch2 }} className="px-1 text-xs font-bold">
            Fora da lista de hoje ({outOfDay.length}) — outra recorrência, categoria inativa ou já encerrada
          </div>
          {outOfDay.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <button onClick={() => setEditingTask(t)}
                style={{ background: "rgba(244,230,197,.25)", border: `2px dashed ${C.goldDeep}` }}
                className="flex flex-1 items-center gap-2.5 rounded-2xl p-2.5 text-left active:scale-[.98] transition">
                <span style={{ background: taskColor(t, data) + "22" }}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-base opacity-70">{taskIcon(t, data)}</span>
                <span className="min-w-0 flex-1">
                  <span style={{ color: C.parch }} className="block truncate text-sm font-bold">{t.name}</span>
                  <span style={{ color: C.parch2 }} className="block text-[10px]">{catView(data, t.category).nome} · {recorrenciaLabel(t)}</span>
                </span>
                <Pencil size={14} style={{ color: C.parch2 }} />
              </button>
              <button onClick={() => removeTask(t.id)} style={{ color: C.ember }} className="p-1 active:scale-90 transition"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* puladas hoje — recolhido, sem tom de cobrança */}
      {skippedTasks.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setShowSkipped((s) => !s)}
            style={{ color: C.parch2 }} className="flex w-full items-center gap-2 px-1 text-xs font-bold">
            <span>{showSkipped ? "▾" : "▸"}</span>
            <span>Puladas hoje ({skippedTasks.length})</span>
            <span style={{ color: C.inkSoft }} className="font-normal">— voltam na próxima vez</span>
          </button>
          {showSkipped && skippedTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <div style={{ background: "rgba(244,230,197,.25)", border: `2px dashed ${C.goldDeep}` }}
                className="flex flex-1 items-center gap-2.5 rounded-2xl p-2.5">
                <span style={{ background: taskColor(t, data) + "22" }}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-base opacity-60">{taskIcon(t, data)}</span>
                <span style={{ color: C.parch }} className="min-w-0 flex-1 truncate text-sm font-bold">{t.name}</span>
              </div>
              <button onClick={() => toggleSkip(t)} style={{ background: C.gold, color: C.ink }}
                className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold active:scale-95 transition">Despular</button>
            </div>
          ))}
        </div>
      )}

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

/* ---------- REINOS (gestão de categorias) ----------
   O usuário define as áreas da própria vida. Categorias de sistema
   (pet/saude) são editáveis e reordenáveis, mas nunca desativadas ou
   apagadas — elas sustentam o monstrinho e a aba Saúde.                */
function CategoryManager({ data, update, onClose }) {
  const cats = sortedCategories(data);
  const activeCount = cats.filter((c) => c.ativa).length;
  const atLimit = activeCount >= MAX_ACTIVE_CATS;
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);

  /** Persiste a lista já renumerando `ordem` pela posição. */
  const commit = (list) => update({ categories: list.map((c, i) => ({ ...c, ordem: i })) });

  const move = (idx, dir) => {
    const next = [...cats];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    commit(next);
  };
  const saveCat = (cat) => {
    const exists = cats.some((c) => c.id === cat.id);
    commit(exists ? cats.map((c) => (c.id === cat.id ? { ...c, ...cat } : c)) : [...cats, cat]);
    setEditingId(null); setAdding(false);
  };
  const toggleAtiva = (cat) => {
    if (cat.sistema) return;                       // sistema nunca desativa
    if (!cat.ativa && atLimit) return;             // respeita o teto ao reativar
    commit(cats.map((c) => (c.id === cat.id ? { ...c, ativa: !c.ativa } : c)));
  };

  return (
    <Panel style={{ background: `linear-gradient(160deg, ${C.parch}, ${C.parch2})` }}>
      <div className="mb-1 flex items-center justify-between">
        <div style={{ color: C.ink }} className="font-serif text-lg font-black">⚙️ Seus Reinos</div>
        <button onClick={onClose} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
      </div>
      <p style={{ color: C.inkSoft }} className="mb-3 text-xs">
        As áreas da sua vida. Renomeie, troque o emoji e a cor, reordene — o jogo se adapta a você.
        <b> {activeCount}/{MAX_ACTIVE_CATS}</b> ativas.
      </p>

      <div className="space-y-2">
        {cats.map((c, i) => (
          <div key={c.id}>
            <div className="flex items-center gap-2 rounded-2xl p-2"
              style={{ background: "rgba(0,0,0,.04)", borderLeft: `6px solid ${c.cor}`, opacity: c.ativa ? 1 : 0.55 }}>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ background: c.cor + "33" }}>{c.emoji}</span>
              <span className="min-w-0 flex-1">
                <span style={{ color: C.ink }} className="block truncate font-bold leading-tight">{c.nome}</span>
                <span style={{ color: C.inkSoft }} className="block text-[10px] font-bold">
                  {c.sistema === "pet" ? "🐾 alimenta o monstrinho" : c.sistema === "saude" ? "💙 usada na aba Saúde" : c.ativa ? "ativa" : "inativa"}
                </span>
              </span>
              <span className="flex flex-shrink-0 flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ color: i === 0 ? "rgba(0,0,0,.2)" : C.inkSoft }}
                  className="px-1 text-xs leading-none active:scale-90" aria-label="Subir">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} style={{ color: i === cats.length - 1 ? "rgba(0,0,0,.2)" : C.inkSoft }}
                  className="px-1 text-xs leading-none active:scale-90" aria-label="Descer">▼</button>
              </span>
              <button onClick={() => { setEditingId(editingId === c.id ? null : c.id); setAdding(false); }}
                style={{ color: C.inkSoft }} className="p-1 active:scale-90"><Pencil size={15} /></button>
              {!c.sistema && (
                <button onClick={() => toggleAtiva(c)} disabled={!c.ativa && atLimit}
                  style={{ background: c.ativa ? C.xpDeep : "rgba(0,0,0,.12)", color: c.ativa ? "#fff" : C.inkSoft, opacity: !c.ativa && atLimit ? 0.5 : 1 }}
                  className="flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold active:scale-95">
                  {c.ativa ? "Ativa" : "Ativar"}
                </button>
              )}
            </div>
            {editingId === c.id && (
              <CategoryForm initial={c} onCancel={() => setEditingId(null)} onSave={saveCat} />
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <CategoryForm onCancel={() => setAdding(false)} onSave={saveCat} />
      ) : atLimit ? (
        <div style={{ color: C.inkSoft, background: "rgba(0,0,0,.04)" }} className="mt-3 rounded-2xl px-3 py-2 text-xs">
          Você já tem <b>{MAX_ACTIVE_CATS} reinos ativos</b> — o máximo para a lista do dia continuar leve.
          Desative um que não esteja usando para abrir espaço. Nada é apagado. 💛
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditingId(null); }} style={{ borderColor: C.goldDeep, color: C.ink }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-2.5 text-sm font-bold active:scale-95 transition">
          <Plus size={16} /> Criar reino
        </button>
      )}

      <p style={{ color: C.inkSoft }} className="mt-3 text-[11px]">
        Reinos não são apagados — desativar esconde da lista do dia, mas guarda todo o histórico e as estatísticas.
      </p>
    </Panel>
  );
}

function CategoryForm({ initial, onCancel, onSave }) {
  const [nome, setNome] = useState(initial?.nome || "");
  const [emoji, setEmoji] = useState(initial?.emoji || "⚔️");
  const [cor, setCor] = useState(initial?.cor || TASK_COLORS[5]);
  const submit = () => {
    const n = nome.trim();
    if (!n) return;
    onSave({
      ...(initial || { ativa: true, sistema: null, ordem: 999 }),
      id: initial?.id || "cat_" + Math.random().toString(36).slice(2),
      nome: n, emoji: emoji.trim() || "⚔️", cor,
    });
  };
  return (
    <div className="mt-2 rounded-2xl p-3" style={{ background: "rgba(255,255,255,.55)", border: `2px solid ${C.goldDeep}` }}>
      <div className="mb-2 flex items-center gap-2 rounded-xl p-2" style={{ background: "rgba(0,0,0,.04)", borderLeft: `6px solid ${cor}` }}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: cor + "33" }}>{emoji}</span>
        <span style={{ color: C.ink }} className="truncate font-bold">{nome.trim() || "Novo reino"}</span>
      </div>

      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do reino (ex.: Estudos)" maxLength={24}
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/70 px-3 py-2 outline-none" />

      <div className="mb-1 flex items-center justify-between">
        <span style={{ color: C.inkSoft }} className="text-xs font-bold">Emoji</span>
        <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} maxLength={2} aria-label="Emoji personalizado"
          style={{ borderColor: C.goldDeep, color: C.ink }} className="w-14 rounded-lg border-2 bg-white/70 px-2 py-1 text-center outline-none" />
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5" style={{ maxHeight: 100, overflowY: "auto" }}>
        {TASK_ICONS.map((ic) => (
          <button key={ic} onClick={() => setEmoji(ic)}
            style={{ background: emoji === ic ? cor + "44" : "rgba(0,0,0,.05)", border: emoji === ic ? `2px solid ${cor}` : "2px solid transparent" }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base active:scale-90 transition">{ic}</button>
        ))}
      </div>

      <div style={{ color: C.inkSoft }} className="mb-1 text-xs font-bold">Cor</div>
      <div className="mb-3 flex flex-wrap gap-2">
        {TASK_COLORS.map((c) => (
          <button key={c} onClick={() => setCor(c)} aria-label={`Cor ${c}`}
            style={{ background: c, border: cor === c ? `3px solid ${C.ink}` : "2px solid rgba(0,0,0,.15)" }}
            className="h-8 w-8 rounded-full active:scale-90 transition" />
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
        <button onClick={submit} style={{ background: C.xpDeep, color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">
          {initial ? "Salvar" : "Criar"}
        </button>
      </div>
    </div>
  );
}

function TaskForm({ data, initial, onCancel, onSave }) {
  // A aba Saúde tem lista própria (remédios e refeições), então a categoria de
  // sistema 'saude' não é oferecida aqui — agora por `sistema`, não por id fixo.
  const cats = activeCategories(data).filter((c) => c.sistema !== "saude");
  const [name, setName] = useState(initial?.name || "");
  const [desc, setDesc] = useState(initial?.desc || "");
  const [xp, setXp] = useState(initial?.xp || 10);
  const [cat, setCat] = useState(initial?.category || cats[0]?.id || "casa");
  const r0 = recorrenciaOf(initial || {});
  const [days, setDays] = useState(initial?.days || (r0.tipo === "dias_semana" ? r0.dias : []) || []);
  const [icon, setIcon] = useState(initial ? taskIcon(initial, data) : "⚔️");
  const [color, setColor] = useState(initial?.color || TASK_COLORS[2]);
  const [dif, setDif] = useState(initial ? dificuldadeOf(initial) : "normal");
  const [rtipo, setRtipo] = useState(r0.tipo);
  const [rn, setRn] = useState(r0.tipo === "a_cada_n_dias" ? r0.n : 3);
  const [rdata, setRdata] = useState(r0.tipo === "unica" ? r0.data : dayKey());
  const WD = [["Dom", 0], ["Seg", 1], ["Ter", 2], ["Qua", 3], ["Qui", 4], ["Sex", 5], ["Sáb", 6]];
  const toggleDay = (n) => setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort((a, b) => a - b)));
  const difInfo = DIFICULDADES.find((d) => d.id === dif) || DIFICULDADES[1];
  /** Trocar a dificuldade sugere a escala de XP, sem travar a escolha. */
  const pickDif = (id) => {
    setDif(id);
    const info = DIFICULDADES.find((d) => d.id === id);
    if (info && !info.xpSug.includes(xp)) {
      const [lo, hi] = info.xpSug;
      if (xp < lo || xp > hi) setXp(lo);
    }
  };
  const buildRecorrencia = () => {
    if (rtipo === "dias_semana") {
      return days.length && days.length < 7 ? { tipo: "dias_semana", dias: days } : { tipo: "sempre" };
    }
    if (rtipo === "a_cada_n_dias") {
      const ancora = (r0.tipo === "a_cada_n_dias" && r0.ancora) ? r0.ancora : dayKey();
      return { tipo: "a_cada_n_dias", n: Math.max(1, Number(rn) || 1), ancora };
    }
    if (rtipo === "unica") return { tipo: "unica", data: rdata || dayKey() };
    return { tipo: "sempre" };
  };
  const submit = () => {
    if (!name.trim()) return;
    const t = { ...(initial || {}), id: initial?.id || "c_" + Math.random().toString(36).slice(2), name: name.trim(), desc: desc.trim(), xp, category: cat, icon, color, dificuldade: dif };
    t.recorrencia = buildRecorrencia();
    // `days` é mantido em sincronia só por retrocompatibilidade desta fase
    if (t.recorrencia.tipo === "dias_semana") t.days = t.recorrencia.dias; else delete t.days;
    onSave(t);
  };
  return (
    <Panel>
      <div style={{ color: C.ink }} className="font-serif font-bold mb-2">{initial ? "Editar missão" : "Nova missão"}</div>

      {/* prévia */}
      <div className="mb-3 flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(0,0,0,.04)", borderLeft: `6px solid ${color}` }}>
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: color + "33" }}>{icon}</span>
        <span style={{ color: C.ink }} className="font-bold">{name.trim() || "Sua missão"}</span>
      </div>

      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da missão"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (opcional)"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />

      {/* ícone */}
      <div className="mb-3">
        <div style={{ color: C.inkSoft }} className="mb-1 text-xs font-bold">Ícone</div>
        <div className="flex flex-wrap gap-1.5" style={{ maxHeight: 132, overflowY: "auto" }}>
          {TASK_ICONS.map((ic) => (
            <button key={ic} onClick={() => setIcon(ic)}
              style={{ background: icon === ic ? color + "44" : "rgba(0,0,0,.05)", border: icon === ic ? `2px solid ${color}` : "2px solid transparent" }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg active:scale-90 transition">{ic}</button>
          ))}
        </div>
      </div>

      {/* cor */}
      <div className="mb-3">
        <div style={{ color: C.inkSoft }} className="mb-1 text-xs font-bold">Cor</div>
        <div className="flex flex-wrap gap-2">
          {TASK_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              style={{ background: c, border: color === c ? `3px solid ${C.ink}` : "2px solid rgba(0,0,0,.15)" }}
              className="h-8 w-8 rounded-full active:scale-90 transition" />
          ))}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} style={{ background: cat === c.id ? c.cor : "rgba(0,0,0,.06)", color: cat === c.id ? "#fff" : C.ink }}
            className="truncate rounded-xl px-2 py-2 text-sm font-bold">{c.emoji} {c.nome}</button>
        ))}
      </div>
      {/* dificuldade (declarada) */}
      <div className="mb-2">
        <div style={{ color: C.inkSoft }} className="mb-1 text-xs font-bold">Dificuldade</div>
        <div className="flex gap-2">
          {DIFICULDADES.map((d) => (
            <button key={d.id} onClick={() => pickDif(d.id)}
              style={{ background: dif === d.id ? C.ink : "rgba(0,0,0,.06)", color: dif === d.id ? C.parch : C.ink }}
              className="flex-1 rounded-xl py-1.5 text-xs font-bold leading-tight">
              <span className="block text-base">{d.emoji}</span>
              {d.label}
              <span className="block text-[9px] font-normal opacity-70">{d.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span style={{ color: C.ink }} className="text-sm font-bold">XP:</span>
        {[3, 5, 10, 15, 20, 30].map((n) => (
          <button key={n} onClick={() => setXp(n)}
            style={{ background: xp === n ? C.xpDeep : "rgba(0,0,0,.06)", color: xp === n ? "#fff" : C.ink }}
            className="flex-1 rounded-lg py-1.5 text-sm font-bold">{n}</button>
        ))}
      </div>
      <div style={{ color: C.inkSoft }} className="mb-3 text-[11px]">
        Sugestão para {difInfo.emoji} {difInfo.label}: {difInfo.xpSug[0]}–{difInfo.xpSug[1]} XP — mas quem manda é você.
      </div>

      {/* recorrência */}
      <div className="mb-3">
        <div style={{ color: C.inkSoft }} className="mb-1 text-xs font-bold">Quando aparece</div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {RECORRENCIA_TIPOS.map((r) => (
            <button key={r.id} onClick={() => setRtipo(r.id)}
              style={{ background: rtipo === r.id ? C.gold : "rgba(0,0,0,.06)", color: rtipo === r.id ? C.ink : C.inkSoft }}
              className="rounded-xl py-1.5 text-xs font-bold">{r.emoji} {r.label}</button>
          ))}
        </div>

        {rtipo === "dias_semana" && (
          <div className="flex gap-1">
            {WD.map(([lbl, n]) => (
              <button key={n} onClick={() => toggleDay(n)} style={{ background: days.includes(n) ? C.gold : "rgba(0,0,0,.06)", color: days.includes(n) ? C.ink : C.inkSoft }}
                className="flex-1 rounded-lg py-1.5 text-[11px] font-bold">{lbl}</button>
            ))}
          </div>
        )}
        {rtipo === "a_cada_n_dias" && (
          <div className="flex items-center gap-2">
            <span style={{ color: C.ink }} className="text-sm font-bold">A cada</span>
            <input type="number" min={1} max={365} value={rn}
              onChange={(e) => setRn(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ borderColor: C.goldDeep, color: C.ink }} className="w-20 rounded-xl border-2 bg-white/60 px-3 py-1.5 text-center outline-none" />
            <span style={{ color: C.ink }} className="text-sm font-bold">dia(s)</span>
          </div>
        )}
        {rtipo === "unica" && (
          <div className="flex items-center gap-2">
            <span style={{ color: C.ink }} className="text-sm font-bold">No dia</span>
            <input type="date" value={rdata} onChange={(e) => setRdata(e.target.value)}
              style={{ borderColor: C.goldDeep, color: C.ink }} className="flex-1 rounded-xl border-2 bg-white/60 px-3 py-1.5 outline-none" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
        <button onClick={submit} style={{ background: C.xpDeep, color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">Salvar</button>
      </div>
    </Panel>
  );
}

/* ---------- MODO FOCO ---------- */
function FocusOverlay({ data, pending, onClose, onDone, onSkip }) {
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
      <div className="my-6 flex h-28 w-28 items-center justify-center rounded-3xl text-6xl"
        style={{ background: taskColor(t, data) + "33", border: `4px solid ${taskColor(t, data)}`, animation: "float 3s ease-in-out infinite" }}>{taskIcon(t, data)}</div>
      <div style={{ color: C.parch }} className="font-serif text-3xl font-black leading-tight">{t.name}</div>
      <div style={{ color: C.parch2 }} className="mt-2">{t.desc}</div>
      <div style={{ color: C.parch2 }} className="mt-2 text-xs font-bold">
        {dificuldadeInfo(t).emoji} {dificuldadeInfo(t).label} · {dificuldadeInfo(t).hint}
      </div>
      <div style={{ color: C.gold }} className="mt-3 font-bold">Recompensa: +{t.xp} XP</div>
      <button onClick={() => { onDone(t); }} style={{ background: C.xp, color: "#06250d", boxShadow: "0 6px 0 #2a6b32" }}
        className="mt-8 flex items-center gap-2 rounded-3xl px-10 py-4 font-serif text-xl font-black active:translate-y-1 active:shadow-none transition">
        <Check size={26} strokeWidth={3} /> Concluir
      </button>
      {/* pular registra de verdade: a missão sai do dia, sem punição */}
      <button onClick={() => { onSkip && onSkip(t); setI(0); }} style={{ color: C.parch2 }} className="mt-4 text-sm font-bold">
        ↷ Pular esta hoje
      </button>
      {list.length > 1 && (
        <button onClick={() => setI((x) => (x + 1) % list.length)} style={{ color: C.parch2 }} className="mt-2 text-xs font-bold opacity-70">
          Ver a próxima →
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

/* ---------- PET / MONSTRINHO ---------- */
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

  // Os lembretes citam o nome que o usuário deu à categoria de cuidado —
  // nunca um nome fixo.
  const careName = catView(data, systemCategoryId(data, "pet")).nome;
  const METERS = [
    { key: "hunger", label: "Fome", emoji: "🍖", color: "#e8843a", nudge: `Hora de pôr comida de verdade — ${careName} 🍖` },
    { key: "thirst", label: "Água", emoji: "💧", color: "#3a8fd8", nudge: `Troque a aguinha — ${careName} 💧` },
    { key: "hygiene", label: "Higiene", emoji: "🧹", color: "#2a8c4a", nudge: `O espaço pede uma limpeza — ${careName} 🧹` },
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

      {/* lembrete de cuidar do pet REAL */}
      {(lows.length > 0 || t.sick) && (
        <Panel style={{ background: "#fff7e6", borderColor: C.ember }}>
          <div style={{ color: C.ink }} className="text-sm">
            <b>{pet.name} te chama 🐾</b> — cuidar dele aqui lembra de cuidar de {careName} na vida real:
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
          As missões de <b>cuidado</b> (comida, água, higiene e diversão) enchem os medidores e fortalecem o <b>vínculo</b>, que faz o {pet.name} evoluir. Ele fica triste/doente, mas <b>nunca</b> morre. 💛
        </p>
      </Panel>
    </div>
  );
}

/* ---------- AVATAR (ilustração + desbloqueio por nível) ---------- */
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

  const healthCat = systemCategoryId(data, "saude");
  const addMed = (period, m) => {
    // remédios e refeições são micro-ações por natureza: sempre "rápida"
    update({ meds: [...meds, { id: "m_" + Math.random().toString(36).slice(2), name: m.name, desc: m.dose, xp: m.xp, category: healthCat, period, med: true, dificuldade: "rapida" }] });
    setAddP(null);
  };
  const removeMed = (id) => update({ meds: meds.filter((m) => m.id !== id), doneToday: data.doneToday.filter((x) => x !== id) });
  const addMeal = (m) => { update({ meals: [...meals, { id: "meal_" + Math.random().toString(36).slice(2), name: m.name, xp: m.xp, dificuldade: "rapida" }] }); setAddingMeal(false); };
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
        <HealthRow key={m.id} t={m} icon={Utensils} done={data.doneToday.includes(m.id)} onToggle={() => toggleTask({ ...m, category: healthCat })} onDelete={editHealth ? () => removeMeal(m.id) : undefined} />
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
  const fav = Object.entries(data.catCounts || {}).sort((a, b) => b[1] - a[1])[0];
  const favCat = fav ? catView(data, fav[0]) : null;
  const favLabel = fav && fav[1] > 0 ? `${favCat.emoji} ${favCat.nome}` : "—";
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

      <Panel style={{ borderColor: C.gold }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div style={{ color: C.ink }} className="flex items-center gap-2 font-serif font-bold">👾 Modo Game Boy</div>
            <div style={{ color: C.inkSoft }} className="mt-0.5 text-xs">Deixa a tela principal (Missões) com visual retrô estilo Game Boy Color.</div>
          </div>
          <button onClick={() => update({ gbMode: !data.gbMode })}
            style={{ background: data.gbMode ? C.xpDeep : "rgba(0,0,0,.1)", color: data.gbMode ? "#fff" : C.ink }}
            className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-bold active:scale-95 transition">{data.gbMode ? "Ligado" : "Desligado"}</button>
        </div>
      </Panel>

      <InstallSection />

      <NotificationsPanel user={user} />

      <AccountPanel user={user} />

      <ResetAdventure data={data} onReset={() => update(freshData())} />

      <button onClick={onSignOut} style={{ color: C.parch }}
        className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold opacity-80">
        <LogOut size={16} /> Sair da conta
      </button>
    </div>
  );
}

/* ---------- Recomeçar aventura (destrutivo: 2 etapas + backup) ---------- */
function ResetAdventure({ data, onReset }) {
  const [step, setStep] = useState(0);        // 0 fechado · 1 explicação · 2 confirmação escrita
  const [txt, setTxt] = useState("");
  const [saved, setSaved] = useState(false);
  const PALAVRA = "RECOMEÇAR";

  const baixarBackup = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questah-backup-${dayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaved(true);
      return true;
    } catch (e) { return false; }
  };

  const confirmar = () => {
    if (txt.trim().toUpperCase() !== PALAVRA) return;
    baixarBackup();                            // backup antes de zerar, sempre
    setStep(0); setTxt(""); setSaved(false);
    onReset();
  };

  if (step === 0) {
    return (
      <button onClick={() => setStep(1)} style={{ color: C.ember }} className="w-full py-2 text-xs font-bold">
        Recomeçar aventura
      </button>
    );
  }

  return (
    <Panel style={{ background: "#2a0e12", borderColor: C.ember }}>
      <div style={{ color: C.ember }} className="font-serif text-lg font-black">⚠️ Recomeçar a aventura</div>
      <p style={{ color: C.parch }} className="mt-1 text-sm">
        Isto apaga <b>tudo</b> e não tem como desfazer: XP, nível, ouro, gemas, sequência de dias,
        conquistas, chefes, o vínculo do seu monstrinho, missões, reinos, recompensas e registros de saúde.
      </p>

      {step === 1 && (
        <>
          <p style={{ color: C.parch2 }} className="mt-2 text-xs">
            Antes de qualquer coisa, guarde uma cópia do seu progresso. Você pode baixá-la agora —
            e ela também será baixada automaticamente na confirmação.
          </p>
          <button onClick={baixarBackup} style={{ background: C.gold, color: C.ink }}
            className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold active:scale-95 transition">
            {saved ? "✅ Backup baixado — baixar de novo" : "⬇️ Baixar backup do meu progresso"}
          </button>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setStep(0); setSaved(false); }} style={{ background: "rgba(255,255,255,.14)", color: C.parch }}
              className="flex-1 rounded-xl py-2 text-sm font-bold active:scale-95 transition">Cancelar</button>
            <button onClick={() => setStep(2)} style={{ background: "rgba(0,0,0,.35)", color: C.ember, border: `2px solid ${C.ember}` }}
              className="flex-1 rounded-xl py-2 text-sm font-bold active:scale-95 transition">Quero continuar</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ color: C.parch2 }} className="mt-2 text-xs">
            Última etapa: digite <b style={{ color: C.ember }}>{PALAVRA}</b> para confirmar.
          </p>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={PALAVRA} autoCapitalize="characters"
            style={{ borderColor: C.ember, color: C.ink }}
            className="mt-2 w-full rounded-xl border-2 bg-white/80 px-3 py-2 text-center font-bold outline-none" />
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setStep(0); setTxt(""); setSaved(false); }} style={{ background: "rgba(255,255,255,.14)", color: C.parch }}
              className="flex-1 rounded-xl py-2 text-sm font-bold active:scale-95 transition">Cancelar</button>
            <button onClick={confirmar} disabled={txt.trim().toUpperCase() !== PALAVRA}
              style={{ background: txt.trim().toUpperCase() === PALAVRA ? C.ember : "rgba(255,255,255,.12)", color: txt.trim().toUpperCase() === PALAVRA ? "#fff" : C.parch2 }}
              className="flex-1 rounded-xl py-2 text-sm font-bold active:scale-95 transition">Apagar tudo</button>
          </div>
        </>
      )}
    </Panel>
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
/** Classe genérica, calculada sobre as categorias do próprio usuário.
 *  (Classes por atributo entram na Fase 4.) */
function getPlayerClass(data, level) {
  const counts = data?.catCounts || {};
  const total = data?.tasksCompleted || 0;
  if (total < 8) return "Aventureiro Novato";
  const entries = categoriesOf(data).map((c) => [c.id, counts[c.id] || 0]);
  if (!entries.length) return "Aventureiro";
  const values = entries.map((e) => e[1]);
  const max = Math.max(...values), min = Math.min(...values);
  if (total >= 60 && max - min <= total * 0.3) return "Herói Lendário";
  const top = [...entries].sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] <= 0) return "Aventureiro";
  return `Guardião de ${catView(data, top[0]).nome}`;
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
