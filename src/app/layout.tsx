import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { SpecialtyProvider } from "@/contexts/SpecialtyContext";
import { ModeProvider } from "@/contexts/ModeContext";
import AuthGuard from "@/components/AuthGuard";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "GastroEd",
  description: "Интерактивное обучение гастроэнтерологии для врачей",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GastroEd",
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
        <AuthProvider>
          <AuthGuard>
            <SpecialtyProvider>
              <ModeProvider>
                {children}
              </ModeProvider>
            </SpecialtyProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
