import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted — see app/fonts/. Swapped from next/font/google because the
// build-time fetch to fonts.gstatic.com is not guaranteed to succeed in every
// production build environment; a failed fetch there silently drops the
// @font-face rule (the CSS variable name still gets referenced everywhere,
// but never defined), so every page falls back to the browser's default serif.
const cinzel = localFont({
  src: [
    { path: "./fonts/cinzel-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cinzel-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-cinzel",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const dmSans = localFont({
  src: "./fonts/dm-sans-variable.woff2",
  weight: "100 1000",
  style: "normal",
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Matt & Raff",
  description: "You're invited to celebrate the wedding of Matt & Raff in Melbourne.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${dmSans.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
