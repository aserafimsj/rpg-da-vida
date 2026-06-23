import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuesTAH",
    short_name: "QuesTAH",
    description:
      "Sua rotina vira aventura. Hábitos, saúde e foco para mentes com TDAH.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1b1430",
    theme_color: "#1b1430",
    orientation: "portrait",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
