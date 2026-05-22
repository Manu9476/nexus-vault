import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
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
      className={cn("dark", "font-sans", inter.variable)}
      style={
        {
          "--font-display": inter.style.fontFamily,
          "--font-body": inter.style.fontFamily,
        } as CSSProperties
      }
    >
      <body className={`${inter.className} bg-nexus-bg text-nexus-text antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
