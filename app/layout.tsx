import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRATTAMENTI",
  description: "Gestionale agricolo per trattamenti, magazzino e costi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
