import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import AppProviders from "@/app/components/AppProviders";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans-custom",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif-custom",
});

export const metadata: Metadata = {
  title: "AI Novel Architect",
  description:
    "Local-first solo authoring suite for planning, drafting, revising, publishing prep, and marketing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <AppProviders>
          <ServiceWorkerRegister />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
