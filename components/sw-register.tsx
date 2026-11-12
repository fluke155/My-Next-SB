"use client";

import { useEffect } from "react";

/** ลงทะเบียน service worker (เฉพาะ production เพื่อไม่ให้ cache กวนตอน dev) */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.error("Service worker registration failed:", err));
  }, []);

  return null;
}
