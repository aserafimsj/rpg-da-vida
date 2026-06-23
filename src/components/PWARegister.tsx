"use client";
import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);
  return null;
}
