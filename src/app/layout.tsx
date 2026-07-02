import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { Providers } from "@/components/Providers";
import { RoleGuard } from "@/components/RoleGuard";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const newsreader = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Coordinatech",
  description: "Plataforma operativa para coordinación técnica, tickets y seguimiento de SLA.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <RoleGuard>{children}</RoleGuard>
        </Providers>
      </body>
    </html>
  );
}
