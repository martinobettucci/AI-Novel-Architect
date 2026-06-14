import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import AppProviders from "@/app/components/AppProviders";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-custom",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif-custom",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-custom",
});

export const metadata: Metadata = {
  title: "AI Novel Architect",
  description:
    "Local-first solo authoring suite for planning, drafting, revising, publishing prep, and marketing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <AppProviders>
          <ServiceWorkerRegister />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
