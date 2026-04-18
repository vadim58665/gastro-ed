import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SpecialtyProvider } from "@/contexts/SpecialtyContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { MedMindProvider } from "@/contexts/MedMindContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthGuard from "@/components/AuthGuard";
import CompanionOverlay from "@/components/medmind/CompanionOverlay";
import ScreenAutoSetter from "@/components/medmind/ScreenAutoSetter";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AuroraIconDefs from "@/components/ui/AuroraIconDefs";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import { PageviewTracker } from "@/lib/analytics/pageview-tracker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "УмныйВрач",
  description: "Интерактивное обучение для врачей",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "УмныйВрач",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8f9fc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-[family-name:var(--font-inter)]">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PageviewTracker />
          </Suspense>
          <ThemeProvider>
            <AuroraIconDefs />
            <AuthProvider>
              <AuthGuard>
                <SubscriptionProvider>
                  <SpecialtyProvider>
                    <ModeProvider>
                      <MedMindProvider>
                        <ScreenAutoSetter />
                        {children}
                        <CompanionOverlay />
                        <ServiceWorkerRegister />
                      </MedMindProvider>
                    </ModeProvider>
                  </SpecialtyProvider>
                </SubscriptionProvider>
              </AuthGuard>
            </AuthProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
