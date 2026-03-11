"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Dev mode: remove workers/caches to avoid stale bundles and hydration mismatches.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .then(async () => {
          if (!("caches" in window)) return;
          const keys = await window.caches.keys();
          await Promise.all(keys.map((key) => window.caches.delete(key)));
        })
        .catch(() => {
          // Ignore cleanup failure in dev; app remains functional.
        });
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      // Ignore registration failure; app remains functional without PWA install.
    });
  }, []);

  return null;
}
