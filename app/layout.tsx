import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./extras.css";
import "./mobile.css";

export const metadata: Metadata = {
  applicationName: "AGRIGAL",
  title: { default: "AGRIGAL · Quaderno di campagna", template: "%s · AGRIGAL" },
  description: "Gestione agricola multiazienda, trattamenti, magazzino e quaderno digitale.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/agrigal-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/agrigal-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/agrigal-icon.png", sizes: "512x512", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "AGRIGAL",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#102419",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
