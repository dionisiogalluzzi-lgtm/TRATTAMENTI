import type { Metadata } from "next";
import "./globals.css";
import "./extras.css";

export const metadata: Metadata = {
  title: { default: "AGRIGAL · Quaderno di campagna", template: "%s · AGRIGAL" },
  description: "Gestione agricola multiazienda, trattamenti, magazzino e quaderno digitale.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
