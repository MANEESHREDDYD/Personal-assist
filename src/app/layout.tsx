import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Personal Assist",
  description: "Your autonomous personal operations assistant",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-background text-foreground bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-background to-black overflow-hidden">
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
