// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { loadSave, persistSave } from "@/lib/save";
import {
  Sword, Store, Cat, Heart, BarChart3, Crown, Flame,
  Plus, Minus, Trash2, X, Target, Zap, Volume2, VolumeX, Coins, Check,
  Trophy, Skull, Droplet, Pill, Sun, Moon, Utensils, LogOut,
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
  { id: "t_comida", key: "comida_mona", name: "Colocar comida para a Mona", desc: "Encha o potinho", xp: 10, category: "pet" },
  { id: "t_agua", key: "agua_mona", name: "Tem água para a Mona", desc: "Água fresca no pote", xp: 5, category: "pet" },
  { id: "t_areia", key: "areia", name: "Areia limpa", desc: "Caixa de areia em ordem", xp: 10, category: "pet" },
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

/* ---------- Saúde: remédios começam vazios (cada um monta o seu) ---------- */
const HEALTH_TASKS = [];
const MED_IDS = HEALTH_TASKS.filter((t) => t.med).map((t) => t.id);
const WATER_GOAL = 8;
const MEAL_GOAL = 5;

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
  { id: "boss_week", name: "Chefe da Semana", emoji: "🐉", desc: "Remédios completos 7 dias seguidos", goal: 7, metric: "medStreak", rewardXp: 500, rewardGold: 200, loot: "Poção da Constância" },
  { id: "boss_month", name: "Chefe do Mês", emoji: "👹", desc: "Conclua 100 tarefas no total", goal: 100, metric: "tasksCompleted", rewardXp: 1000, rewardGold: 1000, loot: "Coroa Lendária 👑" },
];

/* ---------- Mapa da jornada ---------- */
const JOURNEY = [
  { name: "Vila do Caos", xp: 0, emoji: "🏚️" },
  { name: "Aprendiz da Organização", xp: 300, emoji: "🧹" },
  { name: "Guardião da Casa", xp: 900, emoji: "🛡️" },
  { name: "Mestre da Rotina", xp: 2000, emoji: "⚔️" },
  { name: "Lenda Doméstica", xp: 4000, emoji: "🏰" },
];

/* ---------- Evolução da Mona ---------- */
const PET_STAGES = [
  { name: "Gatinha Sonolenta", xp: 0, emoji: "😴" },
  { name: "Exploradora", xp: 200, emoji: "🐱" },
  { name: "Caçadora", xp: 600, emoji: "😼" },
  { name: "Rainha da Casa", xp: 1500, emoji: "👑" },
  { name: "Mona Lendária", xp: 3500, emoji: "🌟" },
];

/* ---------- Mensagens divertidas ao concluir ---------- */
const FUN_MSGS = {
  pet: ["A Mona está orgulhosa de você 🐾", "Ronrom de aprovação ativado", "A Rainha agradece a corte"],
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
  }
}

/* ---------- Estado inicial ---------- */
const DEFAULT_DATA = {
  v: 1,
  playerName: "Herói",
  xpTotal: 0,
  gold: 0,
  doneToday: [],
  lastResetDate: dayKey(),
  customTasks: [],
  customMeds: [],
  rewards: DEFAULT_REWARDS,
  purchases: [],
  tasksCompleted: 0,
  catCounts: { pet: 0, casa: 0, pessoal: 0, saude: 0 },
  taskCounts: {},
  water: { date: dayKey(), count: 0 },
  meals: { date: dayKey(), count: 0 },
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
export default function RpgDaVida({ userId, onSignOut }) {
  const supabase = getSupabase();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("aventura");
  const [pops, setPops] = useState([]);        // popups flutuantes
  const [particles, setParticles] = useState([]);
  const [levelUpBanner, setLevelUpBanner] = useState(null);
  const [bossBanner, setBossBanner] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
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
      let d = { ...DEFAULT_DATA, ...(loaded || {}) };
      // reset diário
      const today = dayKey();
      if (d.lastResetDate !== today) {
        d.doneToday = [];
        d.lastResetDate = today;
        d.water = { date: today, count: 0 };
        d.meals = { date: today, count: 0 };
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
  const allTasks = [...BASE_TASKS, ...data.customTasks];
  const { level, xpInLevel, xpForNext } = levelFromXp(data.xpTotal);
  const pct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));
  const playerClass = getPlayerClass(data.catCounts, data.tasksCompleted, level);
  const petStage = stageFor(PET_STAGES, data.xpTotal);
  const journeyStage = stageFor(JOURNEY, data.xpTotal);
  const petSad = data.lastActiveDate && data.lastActiveDate !== dayKey() && data.lastActiveDate !== yesterdayKey();

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

  /* ---------- concluir / desfazer tarefa ---------- */
  const toggleTask = (task) => {
    const isDone = data.doneToday.includes(task.id);
    setData((prev) => {
      const d = { ...prev };
      if (!isDone) {
        // concluir
        const prevLevel = levelFromXp(d.xpTotal).level;
        d.xpTotal += task.xp;
        d.gold += task.xp;
        d.doneToday = [...d.doneToday, task.id];
        d.tasksCompleted += 1;
        d.catCounts = { ...d.catCounts, [task.category]: (d.catCounts[task.category] || 0) + 1 };
        if (task.key) d.taskCounts = { ...d.taskCounts, [task.key]: (d.taskCounts[task.key] || 0) + 1 };

        // dias ativos + streak
        markActive(d);
        // remédios do dia completos? (inclui remédios adicionados)
        const medIds = [...MED_IDS, ...(d.customMeds || []).map((m) => m.id)];
        if (medIds.length && medIds.every((id) => d.doneToday.includes(id))) {
          const today2 = dayKey();
          if (d.lastMedDate !== today2) {
            d.medStreak = d.lastMedDate === yesterdayKey() ? d.medStreak + 1 : 1;
            d.lastMedDate = today2;
            d.medDaysTotal = (d.medDaysTotal || 0) + 1;
          }
        }
        // novas conquistas
        const newAch = checkAchievements(d, level);
        d.achievements = newAch.list;

        // efeitos (fora do setState idealmente, mas seguro chamar aqui)
        const newLevel = levelFromXp(d.xpTotal).level;
        if (newLevel > prevLevel) {
          if (d.soundOn) sound.levelUp();
          setLevelUpBanner(newLevel);
          setTimeout(() => setLevelUpBanner(null), 2600);
        } else if (d.soundOn) sound.ding();

        spawnPop(`+${task.xp} XP`, CATS[task.category].color);
        spawnParticles(CATS[task.category].color);
        const arr = FUN_MSGS[task.category];
        showToast(arr[Math.floor(Math.random() * arr.length)]);
        if (newAch.unlocked.length) {
          const a = ACHIEVEMENTS.find((x) => x.id === newAch.unlocked[0]);
          setTimeout(() => showToast(`Conquista: ${a.emoji} ${a.name}`), 900);
        }

        // chefes
        const bdef = checkBosses(d);
        if (bdef) {
          d.xpTotal += bdef.rewardXp; d.gold += bdef.rewardGold;
          d.bossesDefeated = [...d.bossesDefeated, bdef.id];
          if (d.soundOn) sound.boss();
          setBossBanner(bdef);
          setTimeout(() => setBossBanner(null), 3200);
        }
      } else {
        // desfazer (reverte contadores; nível recalcula a partir do xpTotal)
        d.xpTotal = Math.max(0, d.xpTotal - task.xp);
        d.gold = Math.max(0, d.gold - task.xp);
        d.doneToday = d.doneToday.filter((id) => id !== task.id);
        d.tasksCompleted = Math.max(0, d.tasksCompleted - 1);
        d.catCounts = { ...d.catCounts, [task.category]: Math.max(0, (d.catCounts[task.category] || 0) - 1) };
        if (task.key) d.taskCounts = { ...d.taskCounts, [task.key]: Math.max(0, (d.taskCounts[task.key] || 0) - 1) };
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

  /* ---------- contadores de saúde (água / refeições) ---------- */
  const incCounter = (kind, delta, xp) => {
    setData((prev) => {
      const d = { ...prev };
      const today = dayKey();
      const cur = d[kind] && d[kind].date === today ? d[kind].count : 0;
      const next = Math.max(0, cur + delta);
      if (next === cur) return prev;
      d[kind] = { date: today, count: next };
      if (delta > 0) {
        d.xpTotal += xp; d.gold += xp; markActive(d);
        if (d.soundOn) sound.ding();
        spawnPop(`+${xp} XP`, CATS.saude.color); spawnParticles(CATS.saude.color);
      } else {
        d.xpTotal = Math.max(0, d.xpTotal - xp); d.gold = Math.max(0, d.gold - xp);
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
            <div style={{ color: C.gold }} className="text-sm mt-2 font-bold">+{bossBanner.rewardXp} XP · +{bossBanner.rewardGold} 🪙</div>
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
        {tab === "aventura" && (
          <Aventura {...{ data, level, xpInLevel, xpForNext, pct, playerClass, petStage, journeyStage,
            visibleTasks, quickOnly, setQuickOnly, toggleTask, setFocusMode, pending, allTasks: todayTasks, update }} />
        )}
        {tab === "loja" && <Loja data={data} buyReward={buyReward} update={update} />}
        {tab === "mona" && <Mona data={data} petStage={petStage} petSad={petSad} />}
        {tab === "saude" && <Saude data={data} incCounter={incCounter} toggleTask={toggleTask} update={update}
          medDone={(() => { const ids = [...MED_IDS, ...(data.customMeds || []).map((m) => m.id)]; return ids.length > 0 && ids.every((id) => data.doneToday.includes(id)); })()} />}
        {tab === "stats" && <Stats data={data} level={level} playerClass={playerClass} sound={sound} update={update} onSignOut={onSignOut} />}
      </main>

      {/* navegação inferior */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-3 pb-3">
        <div style={{ background: C.parch, border: `3px solid ${C.goldDeep}`, boxShadow: "0 -6px 24px rgba(0,0,0,.4)" }}
          className="flex items-center justify-between rounded-2xl px-2 py-2">
          {[
            { k: "aventura", icon: Sword, label: "Missões" },
            { k: "loja", icon: Store, label: "Loja" },
            { k: "mona", icon: Cat, label: "Mona" },
            { k: "saude", icon: Heart, label: "Saúde" },
            { k: "stats", icon: BarChart3, label: "Status" },
          ].map(({ k, icon: Icon, label }) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)}
                style={{ background: on ? C.gold : "transparent", color: on ? C.ink : C.inkSoft }}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-all active:scale-95">
                <Icon size={20} strokeWidth={2.4} />
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
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
function Aventura({ data, level, xpInLevel, xpForNext, pct, playerClass, petStage, journeyStage,
  visibleTasks, quickOnly, setQuickOnly, toggleTask, setFocusMode, pending, allTasks, update }) {
  const [adding, setAdding] = useState(false);
  const grouped = { pet: [], casa: [], pessoal: [] };
  visibleTasks.forEach((t) => grouped[t.category].push(t));
  const doneCount = allTasks.filter((t) => data.doneToday.includes(t.id)).length;

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
          <span className="flex items-center gap-1"><Coins size={16} style={{ color: C.goldDeep }} /> {data.gold} ouro</span>
          <span className="flex items-center gap-1"><Flame size={16} style={{ color: C.ember }} /> {data.currentStreak} dias</span>
          <span style={{ color: C.inkSoft }} className="text-xs">{journeyStage.emoji} {journeyStage.name}</span>
        </div>
      </Panel>

      {/* aviso de streak quebrada (gentil) */}
      {data.streakBrokenNote && (
        <Panel style={{ background: "#fff7e6", borderColor: C.ember }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
            <span className="text-xl">🌅</span>
            <span><b>Todo herói tropeça.</b> Continue a jornada — uma tarefa hoje reacende a chama.</span>
          </div>
        </Panel>
      )}

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
        <span style={{ color: C.gold }}>{doneCount}/{allTasks.length}</span>
      </div>

      {Object.entries(grouped).map(([cat, list]) => list.length > 0 && (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">{CATS[cat].emoji}</span>
            <span style={{ color: C.parch }} className="font-serif font-bold">{CATS[cat].label}</span>
          </div>
          {list.map((t) => {
            const done = data.doneToday.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggleTask(t)}
                style={{ background: done ? "rgba(244,230,197,.45)" : C.parch, border: `3px solid ${done ? C.xpDeep : C.goldDeep}`, boxShadow: done ? "none" : "0 4px 0 rgba(0,0,0,.2)" }}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-[.98] transition">
                <span style={{ background: done ? C.xp : "transparent", border: `2px solid ${done ? C.xpDeep : C.inkSoft}`, color: "#fff" }}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
                  {done && <Check size={18} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span style={{ color: C.ink, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}
                    className="block font-bold leading-tight">{t.name}</span>
                  <span style={{ color: C.inkSoft }} className="block text-xs">{t.desc}</span>
                </span>
                <span className="flex flex-shrink-0 flex-col items-end gap-1">
                  <Tag color={C.xpDeep}>+{t.xp} XP</Tag>
                  {t.xp <= 5 && <span style={{ color: C.inkSoft }} className="text-[9px] font-bold">⚡ rápida</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {/* adicionar tarefa */}
      {adding ? (
        <AddTaskForm onCancel={() => setAdding(false)} onAdd={(t) => { update({ customTasks: [...data.customTasks, t] }); setAdding(false); }} />
      ) : (
        <button onClick={() => setAdding(true)} style={{ borderColor: C.gold, color: C.parch }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-sm font-bold active:scale-95 transition">
          <Plus size={18} /> Criar nova missão
        </button>
      )}

      {data.customTasks.length > 0 && (
        <div style={{ color: C.inkSoft }} className="px-1 text-[11px]">
          Missões personalizadas: toque e segure não disponível — remova em Status › suas missões.
        </div>
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

function AddTaskForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [xp, setXp] = useState(10);
  const [cat, setCat] = useState("casa");
  return (
    <Panel>
      <div style={{ color: C.ink }} className="font-serif font-bold mb-2">Nova missão</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da missão"
        style={{ borderColor: C.goldDeep, color: C.ink }} className="mb-2 w-full rounded-xl border-2 bg-white/60 px-3 py-2 outline-none" />
      <div className="mb-2 flex gap-2">
        {Object.entries(CATS).map(([k, v]) => (
          <button key={k} onClick={() => setCat(k)} style={{ background: cat === k ? v.color : "rgba(0,0,0,.06)", color: cat === k ? "#fff" : C.ink }}
            className="flex-1 rounded-xl py-2 text-sm font-bold">{v.emoji} {v.label}</button>
        ))}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: C.ink }} className="text-sm font-bold">XP:</span>
        {[5, 10, 15, 20].map((n) => (
          <button key={n} onClick={() => setXp(n)} style={{ background: xp === n ? C.xpDeep : "rgba(0,0,0,.06)", color: xp === n ? "#fff" : C.ink }}
            className="flex-1 rounded-lg py-1.5 text-sm font-bold">{n}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} style={{ color: C.inkSoft }} className="flex-1 rounded-xl py-2 text-sm font-bold">Cancelar</button>
        <button onClick={() => { if (name.trim()) onAdd({ id: "c_" + Math.random().toString(36).slice(2), name: name.trim(), desc: "Missão pessoal", xp, category: cat }); }}
          style={{ background: C.xpDeep, color: "#fff" }} className="flex-1 rounded-xl py-2 text-sm font-bold">Adicionar</button>
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
function Loja({ data, buyReward, update }) {
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState(null);
  return (
    <div className="space-y-4">
      <Panel style={{ background: `linear-gradient(160deg, ${C.parch}, ${C.parch2})` }}>
        <div className="flex items-center justify-between">
          <div style={{ color: C.ink }} className="font-serif text-xl font-black">🏪 Loja de Recompensas</div>
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
    </div>
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

/* ---------- MONA: gata branca de olhos azuis (SVG) ---------- */
function MonaCat({ size = 120, sad = false, stageIndex = 0, idle = true }) {
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
      {/* orelhas */}
      <path d="M20 42 L26 12 L46 34 Z" fill="#fff" stroke="#e3e3ea" strokeWidth="1.5" />
      <path d="M80 42 L74 12 L54 34 Z" fill="#fff" stroke="#e3e3ea" strokeWidth="1.5" />
      <path d="M27 38 L30 21 L40 33 Z" fill="#f7c6d9" />
      <path d="M73 38 L70 21 L60 33 Z" fill="#f7c6d9" />
      {/* cabeça */}
      <ellipse cx="50" cy="60" rx="34" ry="30" fill="#fff" stroke="#e3e3ea" strokeWidth="1.5" />
      {crown && <path d="M34 30 L40 20 L46 28 L50 16 L54 28 L60 20 L66 30 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="1.2" />}
      {/* bochechas */}
      <ellipse cx="27" cy="67" rx="6" ry="4" fill="#fbdfe9" />
      <ellipse cx="73" cy="67" rx="6" ry="4" fill="#fbdfe9" />
      {/* olhos */}
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
          <circle cx="38" cy="58" r="8" fill="#bfe3ff" />
          <circle cx="62" cy="58" r="8" fill="#bfe3ff" />
          <circle cx="38" cy="58" r="6" fill="#3a8fd8" />
          <circle cx="62" cy="58" r="6" fill="#3a8fd8" />
          <circle cx="38" cy="58" r="3" fill="#16263b" />
          <circle cx="62" cy="58" r="3" fill="#16263b" />
          <circle cx="40" cy="56" r="1.6" fill="#fff" />
          <circle cx="64" cy="56" r="1.6" fill="#fff" />
          {sad && <path d="M35 65 Q33 71 37 73 Q41 71 39 65 Z" fill="#7ec8ff" />}
        </>
      )}
      {/* nariz */}
      <path d="M47 67 L53 67 L50 71 Z" fill="#f08fb0" />
      {/* boca */}
      {sad ? (
        <path d="M42 80 Q50 74 58 80" fill="none" stroke="#c9a9a9" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M50 71 Q46 78 41 76 M50 71 Q54 78 59 76" fill="none" stroke="#c9a9a9" strokeWidth="2" strokeLinecap="round" />
      )}
      {/* bigodes */}
      <g stroke="#d3d3dc" strokeWidth="1.4" strokeLinecap="round">
        <line x1="13" y1="61" x2="30" y2="63" /><line x1="13" y1="68" x2="30" y2="68" />
        <line x1="87" y1="61" x2="70" y2="63" /><line x1="87" y1="68" x2="70" y2="68" />
      </g>
    </svg>
  );
}

/* ---------- MONA (pet) ---------- */
function Mona({ data, petStage, petSad }) {
  const idx = PET_STAGES.indexOf(petStage);
  const next = PET_STAGES[idx + 1];
  const prog = next ? Math.min(100, Math.round(((data.xpTotal - petStage.xp) / (next.xp - petStage.xp)) * 100)) : 100;
  return (
    <div className="space-y-4">
      <Panel style={{ background: `linear-gradient(160deg, #f0f7ff, ${C.parch2})` }} className="text-center">
        <div className="flex justify-center"><MonaCat size={150} sad={petSad} stageIndex={idx} /></div>
        <div style={{ color: C.ink }} className="mt-1 font-serif text-2xl font-black">Mona</div>
        <div style={{ color: C.rose }} className="font-bold">{petStage.name}</div>
        {petSad ? (
          <p style={{ color: C.inkSoft }} className="mt-2 text-sm">A Mona sente sua falta. Complete uma missão para alegrá-la — sem pressa, sem culpa. 💛</p>
        ) : (
          <p style={{ color: C.inkSoft }} className="mt-2 text-sm">A Mona está feliz e evolui junto com você.</p>
        )}
        {next && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-bold" style={{ color: C.ink }}>
              <span>Para {next.name}</span><span>{prog}%</span>
            </div>
            <div style={{ background: "rgba(58,42,24,.18)" }} className="h-3 w-full overflow-hidden rounded-full">
              <div style={{ width: `${prog}%`, background: `linear-gradient(90deg, ${C.rose}, ${C.gold})`, transition: "width .6s" }} className="h-full rounded-full" />
            </div>
          </div>
        )}
      </Panel>

      <Panel>
        <div style={{ color: C.ink }} className="mb-3 font-serif font-bold">Evolução da Mona</div>
        <div className="space-y-2">
          {PET_STAGES.map((s, i) => {
            const reached = data.xpTotal >= s.xp;
            const current = s === petStage;
            return (
              <div key={s.name} className="flex items-center gap-3" style={{ opacity: reached ? 1 : 0.45 }}>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
                  {reached ? <MonaCat size={36} stageIndex={i} idle={false} /> : <span className="text-2xl">🥚</span>}
                </div>
                <div className="flex-1">
                  <div style={{ color: C.ink }} className="text-sm font-bold">{s.name}</div>
                  <div style={{ color: C.inkSoft }} className="text-xs">{s.xp} XP</div>
                </div>
                {current && <Tag color={C.rose}>agora</Tag>}
                {reached && !current && <Check size={16} style={{ color: C.xpDeep }} />}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ---------- SAÚDE (cuidando de você) ---------- */
function HealthRow({ t, done, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onToggle}
        style={{ background: done ? "rgba(52,179,160,.12)" : C.parch, border: `3px solid ${done ? C.xpDeep : "#34b3a0"}`, boxShadow: done ? "none" : "0 4px 0 rgba(0,0,0,.2)" }}
        className="flex flex-1 items-center gap-3 rounded-2xl p-3 text-left active:scale-[.98] transition">
        <span style={{ background: done ? C.xp : "transparent", border: `2px solid ${done ? C.xpDeep : C.inkSoft}`, color: "#fff" }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
          {done ? <Check size={18} strokeWidth={3} /> : <Pill size={15} style={{ color: C.inkSoft }} />}
        </span>
        <span className="min-w-0 flex-1">
          <span style={{ color: C.ink, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}
            className="block font-bold leading-tight">{t.name}</span>
          <span style={{ color: C.inkSoft }} className="block text-xs">{t.desc}</span>
        </span>
        <Tag color={C.xpDeep}>+{t.xp} XP</Tag>
      </button>
      {onDelete && (
        <button onClick={onDelete} style={{ color: C.inkSoft }} className="p-1 active:scale-90 transition"><Trash2 size={16} /></button>
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

function CounterCard({ icon: Icon, label, sub, count, goal, color, onInc, onDec }) {
  const pct = Math.min(100, Math.round((count / goal) * 100));
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <span style={{ background: color }} className="flex h-10 w-10 items-center justify-center rounded-xl text-white"><Icon size={20} /></span>
        <div className="flex-1">
          <div style={{ color: C.ink }} className="font-bold leading-tight">{label}</div>
          <div style={{ color: C.inkSoft }} className="text-xs">{sub}</div>
        </div>
        <button onClick={onDec} style={{ borderColor: C.goldDeep, color: C.inkSoft }}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 active:scale-90 transition"><Minus size={16} /></button>
        <span style={{ color: C.ink }} className="w-10 text-center font-serif text-xl font-black">{count}</span>
        <button onClick={onInc} style={{ background: color, color: "#fff" }}
          className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90 transition"><Plus size={18} /></button>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs font-bold" style={{ color: C.ink }}><span>Meta de hoje</span><span>{count}/{goal}</span></div>
        <div style={{ background: "rgba(58,42,24,.18)" }} className="h-3 w-full overflow-hidden rounded-full">
          <div style={{ width: `${pct}%`, background: color, transition: "width .5s" }} className="h-full rounded-full" />
        </div>
      </div>
    </Panel>
  );
}

function Saude({ data, incCounter, toggleTask, update, medDone }) {
  const [addP, setAddP] = useState(null);
  const today = dayKey();
  const water = data.water && data.water.date === today ? data.water.count : 0;
  const meals = data.meals && data.meals.date === today ? data.meals.count : 0;
  const customMeds = data.customMeds || [];
  const morning = [...HEALTH_TASKS.filter((t) => t.period === "manha"), ...customMeds.filter((m) => m.period === "manha")];
  const night = [...HEALTH_TASKS.filter((t) => t.period === "noite"), ...customMeds.filter((m) => m.period === "noite")];
  const allMeds = [...HEALTH_TASKS, ...customMeds];
  const medsDone = allMeds.filter((m) => data.doneToday.includes(m.id)).length;
  const medFrac = allMeds.length ? medsDone / allMeds.length : 1;
  const vit = Math.round(((medFrac + Math.min(1, water / WATER_GOAL) + Math.min(1, meals / MEAL_GOAL)) / 3) * 100);

  const addMed = (period, m) => {
    update({ customMeds: [...customMeds, { id: "m_" + Math.random().toString(36).slice(2), name: m.name, desc: m.dose, xp: m.xp, category: "saude", period, med: true, custom: true }] });
    setAddP(null);
  };
  const removeMed = (id) => update({ customMeds: customMeds.filter((m) => m.id !== id), doneToday: data.doneToday.filter((x) => x !== id) });

  const AddButton = ({ period }) => (
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

      {/* manhã */}
      <div style={{ color: C.parch }} className="flex items-center gap-2 px-1 font-serif text-lg font-bold"><Sun size={20} /> Manhã</div>
      {morning.map((t) => (
        <HealthRow key={t.id} t={t} done={data.doneToday.includes(t.id)} onToggle={() => toggleTask(t)} onDelete={t.custom ? () => removeMed(t.id) : undefined} />
      ))}
      {addP === "manha" ? <AddMedForm period="manha" onCancel={() => setAddP(null)} onAdd={(m) => addMed("manha", m)} /> : <AddButton period="manha" />}

      {/* ao longo do dia */}
      <div style={{ color: C.parch }} className="px-1 font-serif text-lg font-bold">Ao longo do dia</div>
      <CounterCard icon={Droplet} label="Beber água" sub={`Meta: ${WATER_GOAL} copos`} count={water} goal={WATER_GOAL} color="#3a8fd8"
        onInc={() => incCounter("water", 1, 2)} onDec={() => incCounter("water", -1, 2)} />
      <CounterCard icon={Utensils} label="Refeições" sub="Comer de 3 em 3 horas" count={meals} goal={MEAL_GOAL} color="#e08a3c"
        onInc={() => incCounter("meals", 1, 3)} onDec={() => incCounter("meals", -1, 3)} />

      {/* noite */}
      <div style={{ color: C.parch }} className="flex items-center gap-2 px-1 font-serif text-lg font-bold"><Moon size={20} /> Noite</div>
      {night.map((t) => (
        <HealthRow key={t.id} t={t} done={data.doneToday.includes(t.id)} onToggle={() => toggleTask(t)} onDelete={t.custom ? () => removeMed(t.id) : undefined} />
      ))}
      {addP === "noite" ? <AddMedForm period="noite" onCancel={() => setAddP(null)} onAdd={(m) => addMed("noite", m)} /> : <AddButton period="noite" />}

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
function Stats({ data, level, playerClass, sound, update, onSignOut }) {
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

      {/* missões personalizadas */}
      {data.customTasks.length > 0 && (
        <Panel>
          <div style={{ color: C.ink }} className="mb-2 font-serif font-bold">Suas missões</div>
          {data.customTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-1 text-sm" style={{ color: C.ink }}>
              <span>{CATS[t.category].emoji} {t.name}</span>
              <button onClick={() => update({ customTasks: data.customTasks.filter((x) => x.id !== t.id), doneToday: data.doneToday.filter((id) => id !== t.id) })}
                style={{ color: C.ember }}><Trash2 size={16} /></button>
            </div>
          ))}
        </Panel>
      )}

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

      <button onClick={() => { if (confirm("Recomeçar a aventura do zero? Tudo será apagado.")) { update({ ...DEFAULT_DATA }); } }}
        style={{ color: C.ember }} className="w-full py-2 text-xs font-bold">Recomeçar aventura</button>

      <button onClick={onSignOut} style={{ color: C.parch }}
        className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold opacity-80">
        <LogOut size={16} /> Sair da conta
      </button>
    </div>
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
      @media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms!important} }
    `}</style>
  );
}
