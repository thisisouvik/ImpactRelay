import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImpactRelay — Evidence desk",
  description: "A calm, reviewable AI caseworker for community assistance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
