import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "ImpactRelay — Evidence before confidence",
    template: "%s · ImpactRelay",
  },
  description: "A trustworthy AI casework desk that turns uncertain requests into bounded, evidence-backed next steps.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "ImpactRelay — Evidence before confidence",
    description: "A trustworthy AI casework desk that turns uncertain requests into bounded, evidence-backed next steps.",
    images: [{ url: "/logo.png", width: 1290, height: 1219, alt: "ImpactRelay Logo" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
