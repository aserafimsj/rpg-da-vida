import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MIN = 15; // janela: o agendador deve rodar a cada ~15 min

function configured() {
  return !!(
    process.env.VAPID_SUBJECT &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function minutesNowInTz(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const hh = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const mm = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return { nowMin: hh * 60 + mm, hh };
  } catch {
    return { nowMin: -1, hh: -1 };
  }
}

function isDue(times: string[], tz: string) {
  const { nowMin } = minutesNowInTz(tz);
  if (nowMin < 0) return false;
  return (times || []).some((t) => {
    const [H, M] = String(t).split(":").map(Number);
    if (Number.isNaN(H) || Number.isNaN(M)) return false;
    let diff = nowMin - (H * 60 + M);
    if (diff < 0) diff += 1440;
    return diff < WINDOW_MIN;
  });
}

function messageFor(tz: string) {
  const { hh } = minutesNowInTz(tz);
  if (hh < 12) return { title: "🗡️ Missões da manhã", body: "Bom dia, herói! Abra o QuesTAH e comece o dia marcando suas missões." };
  if (hh < 18) return { title: "☀️ Missões da tarde", body: "Pausa pra cuidar da rotina — e da glicose. Pequenos passos contam!" };
  return { title: "🌙 Missões da noite", body: "Reta final do dia! Feche o que falta e tome os remédios da noite." };
}

async function handle(req: Request) {
  if (!configured()) {
    return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });
  }
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const testMode = url.searchParams.get("test") === "1";

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  );

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("enabled", true);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0, removed = 0, skipped = 0;

  for (const row of subs || []) {
    const tz = row.timezone || "America/Sao_Paulo";
    if (!testMode && !isDue(row.times || [], tz)) { skipped++; continue; }
    const msg = messageFor(tz);
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url: "/" });
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent++;
    } catch (e: any) {
      const code = e?.statusCode;
      if (code === 404 || code === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
        removed++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, removed, skipped, testMode });
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }
