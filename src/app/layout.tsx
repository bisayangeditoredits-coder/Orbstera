import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Lora, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { PageTransition } from "@/components/layout/PageTransition";
import { GlobalNavbar } from "@/components/layout/GlobalNavbar";
import { CommandPalette } from "@/components/ui/CommandPalette";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["300","400","500","600","700","800","900"] });

export const metadata: Metadata = {
  title: "Orbstera — Futuristic Presentation Generation",
  description: "Generate professional, fully designed presentations from a single text prompt using AI. Cinematic decks in seconds.",
  openGraph: {
    title: "Orbstera",
    description: "AI-powered presentation creation for creative professionals.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FDFCF9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${lora.variable} ${montserrat.variable} font-sans bg-background text-textMain min-h-dvh max-w-[100vw] overflow-x-clip antialiased`}>
        <Providers>
          <GlobalNavbar />
          <CommandPalette />
          <PageTransition>
            {children}
          </PageTransition>
        </Providers>
      </body>
    </html>
  );
}
