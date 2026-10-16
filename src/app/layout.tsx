import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, VT323 } from "next/font/google";
import "./globals.css";

const jb = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--jb",
  weight: ["300", "400", "500", "600", "700"],
});

const vt = VT323({
  subsets: ["latin"],
  variable: "--vt323",
  weight: "400",
});

export const metadata: Metadata = {
  title: "GwijiLand — Linux in your browser",
  description:
    "A full Linux development environment in the browser: real bash terminals, a file system, an editor, package managers and GitHub push/pull — like UserLAnd or Codespaces, anywhere.",
};

export const viewport: Viewport = {
  themeColor: "#070a08",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="phosphor" className={`${jb.variable} ${vt.variable}`}>
      <body className="font-jb">{children}</body>
    </html>
  );
}
