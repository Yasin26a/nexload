import type { Metadata } from "next";
import { Share_Tech_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono",
});

const rajdhani = Rajdhani({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "NEXLOAD // Video Downloader",
  description: "Cybernetic video acquisition system. Download from any platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${shareTechMono.variable} ${rajdhani.variable}`}>
      <body className="bg-[#050505] text-slate-100 font-display antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
