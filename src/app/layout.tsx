import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Gouv-API — Prospection B2B",
  description:
    "Outil de prospection B2B exploitant les API publiques françaises.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
