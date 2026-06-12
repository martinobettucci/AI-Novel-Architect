import type { Metadata } from "next";
import AppProviders from "@/app/components/AppProviders";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Novel Architect",
  description:
    "Local-first solo authoring suite for planning, drafting, revising, publishing prep, and marketing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AppProviders>
          <ServiceWorkerRegister />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
