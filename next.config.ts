import type { NextConfig } from "next";

// PWA: ручной service worker в public/sw.js, регистрируется через
// src/components/ServiceWorkerRegister.tsx. @ducanh2912/next-pwa не работает
// с Next 16 + Turbopack (тихо ничего не генерирует), поэтому wrap убран
// чтобы будущие апдейты библиотеки не перезаписали наш SW неожиданно.

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ],
    },
  ],
};

export default nextConfig;
