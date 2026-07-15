import type { Metadata } from "next";
import { IBM_Plex_Sans, Inconsolata } from "next/font/google";
import "./globals.css";

// Primary: Inconsolata (data, labels, nav, H1 hero) → --font-primary (mono).
const inconsolata = Inconsolata({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-primary",
  display: "swap",
});

// Secondary: IBM Plex Sans (body copy, buttons, H2–H5) → --font-secondary (sans).
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-secondary",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Salty Cape",
  description: "Cape Cod fishing spots, conditions, and technique.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inconsolata.variable} ${ibmPlexSans.variable} h-full antialiased`}
      // Browser extensions (e.g. Scribe) inject attributes like
      // `data-scribe-recorder-ready` onto <html> before hydration; ignore those
      // attribute mismatches on the root element only.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
