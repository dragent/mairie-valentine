import type { Metadata } from "next";
import { Geist, Geist_Mono, Libre_Bodoni, Rye } from "next/font/google";
import { headers } from "next/headers";

import { AuthGate } from "@/components/auth-gate";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/lib/auth-context";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rye = Rye({
  variable: "--font-rye",
  weight: "400",
  subsets: ["latin"],
});

const register = Libre_Bodoni({
  variable: "--font-register",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mairie de Valentine",
    template: "%s — Mairie de Valentine",
  },
  description:
    "Services administratifs de la ville de Valentine : registre des citoyens, documents officiels et arrêtés municipaux.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="fr"
      nonce={nonce}
      className={`${geistSans.variable} ${geistMono.variable} ${rye.variable} ${register.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
            <AuthGate>{children}</AuthGate>
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
