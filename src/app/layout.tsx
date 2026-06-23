import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "../components/PWARegister";

export const metadata: Metadata = {
  title: "QuesTAH",
  description: "Sua rotina vira aventura. Hábitos, saúde e foco para mentes com TDAH.",
  applicationName: "QuesTAH",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuesTAH",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1b1430",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
