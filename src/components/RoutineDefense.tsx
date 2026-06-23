// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/* ---------- paleta ---------- */
const P = {
  night: "#1b1430", night2: "#241a40", parch: "#f4e6c5", ink: "#3a2a18",
  gold: "#e8b339", goldDeep: "#b3801c", lane1: "#cfe8b0", lane2: "#c2dfa0",
  house: "#7a4f30", foco: "#5aa9e6", enemy: "#7d4ba0", proj: "#f5d77a", hp: "#e0533a",
};

/* ---------- dimensões lógicas ---------- */
const W = 750, H = 450;
const HOUSE_X = 110;          // limite da casa (esquerda)
const COLS = 5, ROWS = 3;
const COLW = (W - HOUSE_X) / COLS;
const ROWH = H / ROWS;
const cellX = (c) => HOUSE_X + c * COLW + COLW / 2;
const cellY = (r) => r * ROWH + ROWH / 2;

/* ---------- defensores ---------- */
const DEFS = {
  cafe: { id: "cafe", emoji: "☕", cost: 50, hp: 6, label: "Café", desc: "gera Foco" },
  hero: { id: "hero", emoji: "🛡️", cost: 75, hp: 8, label: "Herói", desc: "ataca" },
};
const FOCO_START = 100;
const FOCO_REGEN = 4;          // por segundo (passivo)
const CAFE_AMOUNT = 25, CAFE_EVERY = 5;
const HERO_EVERY = 1.4, HERO_DMG = 2, PROJ_SPEED = 320;
const EAT_DPS = 2;
const GRACE = 3.2;             // segundos antes da 1ª onda

let UID = 1;
const uid = () => UID++;

export default function RoutineDefense({ avatarSrc, onClose, onRunEnd, best = 0 }) {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const imgRef = useRef(null);
  const [hud, setHud] = useState({ foco: FOCO_START, wave: 0, score: 0, selected: "cafe", status: "ready" });
  const [over, setOver] = useState(null); // {waves, gems}

  // carrega a imagem do herói
  useEffect(() => {
    if (!avatarSrc) return;
    const img = new Image();
    img.src = avatarSrc;
    img.onload = () => { imgRef.current = img; };
  }, [avatarSrc]);

  function freshGame() {
    return {
      foco: FOCO_START, wave: 0, score: 0, selected: "cafe", status: "ready",
      defenders: [], enemies: [], projs: [],
      phase: "grace", timer: GRACE, spawnLeft: 0, spawnTimer: 0,
    };
  }

  function startWave(g) {
    g.wave += 1;
    g.spawnLeft = 1 + g.wave;                 // onda N => N+1 inimigos
    g.spawnTimer = 0;
    g.phase = "spawning";
  }

  function spawnEnemy(g) {
    const r = Math.floor(Math.random() * ROWS);
    const hp = Math.round(4 + g.wave * 1.6);
    const speed = Math.min(70, 26 + g.wave * 2.2);
    g.enemies.push({ id: uid(), r, x: W + 10, hp, maxHp: hp, speed });
  }

  // ---------- loop ----------
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    gRef.current = freshGame();
    let raf, last = performance.now(), alive = true;

    const step = (now) => {
      if (!alive) return;
      const g = gRef.current;
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.05) dt = 0.05; // evita saltos

      if (g.status === "playing") update(g, dt);
      draw(ctx, g);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // sincroniza HUD (sem re-render a cada frame)
    const sync = setInterval(() => {
      const g = gRef.current;
      if (!g) return;
      setHud({ foco: Math.floor(g.foco), wave: g.wave, score: g.score, selected: g.selected, status: g.status });
    }, 150);

    return () => { alive = false; cancelAnimationFrame(raf); clearInterval(sync); };
  }, []);

  function update(g, dt) {
    // foco passivo
    g.foco += FOCO_REGEN * dt;

    // fases de onda
    if (g.phase === "grace") {
      g.timer -= dt;
      if (g.timer <= 0) startWave(g);
    } else if (g.phase === "spawning") {
      g.spawnTimer -= dt;
      if (g.spawnLeft > 0 && g.spawnTimer <= 0) {
        spawnEnemy(g);
        g.spawnLeft -= 1;
        g.spawnTimer = Math.max(0.9, 1.8 - g.wave * 0.05);
      }
      if (g.spawnLeft <= 0 && g.enemies.length === 0) {
        g.score += 1;            // onda limpa
        g.phase = "break"; g.timer = 3;
      }
    } else if (g.phase === "break") {
      g.timer -= dt;
      if (g.timer <= 0) startWave(g);
    }

    // defensores
    for (const d of g.defenders) {
      d.cd -= dt;
      if (d.type === "cafe") {
        if (d.cd <= 0) { g.foco += CAFE_AMOUNT; d.cd = CAFE_EVERY; }
      } else {
        const target = g.enemies.some((e) => e.r === d.r && e.x > d.x);
        if (d.cd <= 0 && target) {
          g.projs.push({ id: uid(), r: d.r, x: d.x + 16, y: cellY(d.r) - 6, dmg: HERO_DMG });
          d.cd = HERO_EVERY;
        }
      }
    }

    // projéteis
    for (const p of g.projs) p.x += PROJ_SPEED * dt;
    for (const p of g.projs) {
      const hit = g.enemies.find((e) => e.r === p.r && Math.abs(e.x - p.x) < 24 && e.x > HOUSE_X);
      if (hit) { hit.hp -= p.dmg; p.dead = true; }
    }
    g.projs = g.projs.filter((p) => !p.dead && p.x < W + 20);

    // inimigos
    for (const e of g.enemies) {
      // defensor mais próximo à esquerda, na mesma pista
      let block = null;
      for (const d of g.defenders) {
        if (d.r === e.r && d.x < e.x) { if (!block || d.x > block.x) block = d; }
      }
      if (block && e.x - block.x < 38) {
        block.hp -= EAT_DPS * dt;
        if (block.hp <= 0) g.defenders = g.defenders.filter((d) => d !== block);
      } else {
        e.x -= e.speed * dt;
      }
      if (e.x <= HOUSE_X) { endRun(g); return; }
    }
    g.enemies = g.enemies.filter((e) => e.hp > 0);
  }

  function endRun(g) {
    g.status = "over";
    const waves = g.score;
    const gems = onRunEnd ? (onRunEnd(waves) || 0) : 0;
    setOver({ waves, gems });
    setHud((h) => ({ ...h, status: "over" }));
  }

  // ---------- desenho ----------
  function draw(ctx, g) {
    ctx.clearRect(0, 0, W, H);
    // pistas
    for (let r = 0; r < ROWS; r++) {
      ctx.fillStyle = r % 2 ? P.lane2 : P.lane1;
      ctx.fillRect(0, r * ROWH, W, ROWH);
    }
    // casa
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(0, 0, HOUSE_X, H);
    ctx.font = "54px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏰", HOUSE_X / 2, H / 2);
    // grade
    ctx.strokeStyle = "rgba(0,0,0,.08)";
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(HOUSE_X + c * COLW, 0); ctx.lineTo(HOUSE_X + c * COLW, H); ctx.stroke(); }
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(HOUSE_X, r * ROWH); ctx.lineTo(W, r * ROWH); ctx.stroke(); }

    // defensores
    for (const d of g.defenders) {
      const x = d.x, y = cellY(d.r);
      if (d.type === "hero" && imgRef.current) {
        const sz = ROWH * 0.78;
        ctx.drawImage(imgRef.current, x - sz / 2, y - sz / 2, sz, sz);
      } else {
        ctx.font = "40px serif"; ctx.fillText(DEFS[d.type].emoji, x, y);
      }
      bar(ctx, x - 18, y - ROWH * 0.42, 36, d.hp / d.maxHp, "#2a8c4a");
    }
    // inimigos
    for (const e of g.enemies) {
      ctx.font = "40px serif"; ctx.fillText("👾", e.x, cellY(e.r));
      bar(ctx, e.x - 18, cellY(e.r) - ROWH * 0.42, 36, e.hp / e.maxHp, P.hp);
    }
    // projéteis
    ctx.fillStyle = P.proj;
    for (const p of g.projs) { ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill(); }

    // aviso de onda / grace
    if (g.phase === "grace" || g.phase === "break") {
      ctx.fillStyle = "rgba(27,20,48,.55)";
      ctx.fillRect(0, H / 2 - 26, W, 52);
      ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif";
      ctx.fillText(g.phase === "grace" ? "Prepare suas defesas!" : `Onda ${g.wave + 1} chegando…`, W / 2, H / 2);
    }
  }
  function bar(ctx, x, y, w, frac, color) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 5);
  }

  // ---------- input ----------
  function place(clientX, clientY) {
    const g = gRef.current; if (!g || g.status !== "playing") return;
    const cv = canvasRef.current; const rect = cv.getBoundingClientRect();
    const x = (clientX - rect.left) * (W / rect.width);
    const y = (clientY - rect.top) * (H / rect.height);
    if (x < HOUSE_X) return;
    const c = Math.floor((x - HOUSE_X) / COLW), r = Math.floor(y / ROWH);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    if (g.defenders.some((d) => d.r === r && d.c === c)) return;
    const def = DEFS[g.selected];
    if (g.foco < def.cost) return;
    g.foco -= def.cost;
    g.defenders.push({ id: uid(), type: def.id, r, c, x: cellX(c), y: cellY(r), hp: def.hp, maxHp: def.hp, cd: def.id === "cafe" ? CAFE_EVERY : 0 });
  }

  function startGame() {
    const g = freshGame(); g.status = "playing"; gRef.current = g;
    setOver(null);
    setHud({ foco: FOCO_START, wave: 0, score: 0, selected: "cafe", status: "playing" });
  }
  function select(id) { if (gRef.current) gRef.current.selected = id; setHud((h) => ({ ...h, selected: id })); }

  return (
    <div style={{ background: "rgba(15,10,28,.92)" }} className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div style={{ background: P.night2, border: `3px solid ${P.gold}` }} className="w-full max-w-md rounded-2xl p-3">
        {/* topo */}
        <div className="mb-2 flex items-center justify-between">
          <div style={{ color: P.parch }} className="font-serif text-lg font-black">🎮 Defesa da Rotina</div>
          <button onClick={onClose} style={{ color: P.parch }} className="p-1"><X size={20} /></button>
        </div>

        {/* HUD */}
        <div className="mb-2 flex items-center justify-between text-sm font-bold" style={{ color: P.parch }}>
          <span style={{ color: P.foco }}>⚡ {hud.foco} Foco</span>
          <span>🌊 Onda {hud.wave}</span>
          <span style={{ color: P.gold }}>🏆 {hud.score}</span>
        </div>

        {/* campo */}
        <div className="relative overflow-hidden rounded-xl" style={{ border: `2px solid ${P.goldDeep}` }}>
          <canvas
            ref={canvasRef} width={W} height={H}
            onPointerDown={(e) => place(e.clientX, e.clientY)}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
          />

          {hud.status === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center" style={{ background: "rgba(27,20,48,.8)" }}>
              <div style={{ color: P.parch }} className="px-6 text-sm">
                Os Monstros do Caos vêm pela direita. Coloque <b>☕ Café</b> pra gerar Foco e <b>🛡️ Heróis</b> pra atacar. Não deixe chegarem na casa!
              </div>
              <button onClick={startGame} style={{ background: P.gold, color: P.ink }} className="rounded-xl px-6 py-2.5 font-serif font-black active:scale-95">▶ Começar</button>
              <div style={{ color: P.parch }} className="text-xs opacity-80">Recorde: {best} ondas</div>
            </div>
          )}

          {hud.status === "over" && over && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center" style={{ background: "rgba(27,20,48,.86)" }}>
              <div className="text-4xl">🏰💥</div>
              <div style={{ color: P.parch }} className="font-serif text-xl font-black">Fim da defesa!</div>
              <div style={{ color: P.gold }} className="font-bold">{over.waves} ondas sobrevividas</div>
              {over.gems > 0
                ? <div style={{ color: "#cda6f0" }} className="text-sm font-bold">+{over.gems} 💎 ganhas!</div>
                : <div style={{ color: P.parch }} className="text-xs opacity-80">Limite de gemas de hoje atingido — jogue pela glória! 🏆</div>}
              {over.waves >= best && over.waves > 0 && <div style={{ color: P.gold }} className="text-xs">✨ Novo recorde!</div>}
              <div className="mt-1 flex gap-2">
                <button onClick={startGame} style={{ background: P.gold, color: P.ink }} className="rounded-xl px-4 py-2 font-bold active:scale-95">Jogar de novo</button>
                <button onClick={onClose} style={{ background: "rgba(255,255,255,.12)", color: P.parch }} className="rounded-xl px-4 py-2 font-bold active:scale-95">Sair</button>
              </div>
            </div>
          )}
        </div>

        {/* seleção de defensores */}
        <div className="mt-3 flex gap-2">
          {Object.values(DEFS).map((d) => {
            const sel = hud.selected === d.id;
            const can = hud.foco >= d.cost;
            return (
              <button key={d.id} onClick={() => select(d.id)} disabled={hud.status !== "playing"}
                style={{ background: sel ? P.gold : "rgba(255,255,255,.08)", color: sel ? P.ink : P.parch, opacity: hud.status === "playing" ? (can ? 1 : 0.55) : 0.4, border: `2px solid ${sel ? P.goldDeep : "transparent"}` }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold active:scale-95 transition">
                <span className="text-xl">{d.emoji}</span>
                <span className="text-left leading-tight">{d.label}<br /><span style={{ color: sel ? P.ink : P.foco }} className="text-[11px]">⚡{d.cost} · {d.desc}</span></span>
              </button>
            );
          })}
        </div>
        <p style={{ color: P.parch }} className="mt-2 text-center text-[11px] opacity-70">Toque num defensor e depois numa célula do tabuleiro para posicioná-lo.</p>
      </div>
    </div>
  );
}
