import type { Metadata } from "next";
import { Geist, Geist_Mono, Rye } from "next/font/google";

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

export const metadata: Metadata = {
  title: {
    default: "Mairie de Valentine",
    template: "%s — Mairie de Valentine",
  },
  description:
    "Services administratifs de la ville de Valentine : registre des citoyens, documents officiels et arrêtés municipaux.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${rye.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
