import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Geist } from "next/font/google";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Nexus",
    template: "%s · Nexus",
  },
  description: "Private personal vault for photos and documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", "font-sans", geist.variable)}
      style={
        {
          "--font-display": displayFont.style.fontFamily,
          "--font-body": bodyFont.style.fontFamily,
        } as CSSProperties
      }
    >
      <body className={`${bodyFont.className} bg-slate-950 text-zinc-50 antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
