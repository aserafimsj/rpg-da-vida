"use client";

// Guarda o evento de instalação assim que o navegador o dispara (pode ser cedo,
// antes da aba Status existir), e deixa qualquer componente reagir.
let deferred: any = null;
const subs = new Set<() => void>();

function notify() { subs.forEach((f) => f()); }

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function getDeferred() { return deferred; }
export function subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }
export async function doInstall() {
  if (!deferred) return false;
  deferred.prompt();
  try { await deferred.userChoice; } catch (e) {}
  deferred = null;
  notify();
  return true;
}
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}
export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
}
