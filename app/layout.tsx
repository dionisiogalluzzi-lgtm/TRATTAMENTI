import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { PwaRuntime } from "@/components/pwa-runtime";
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
      { url: "/agrigal-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/agrigal-icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/agrigal-icon-192.png", sizes: "192x192", type: "image/png" }],
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

const installCapture = `
  window.__agrigalInstallPrompt = window.__agrigalInstallPrompt || null;
  window.__agrigalInstalled = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window.__agrigalInstallPrompt = event;
    window.dispatchEvent(new Event('agrigal-install-ready'));
  });
  window.addEventListener('appinstalled', function () {
    window.__agrigalInstalled = true;
    window.__agrigalInstallPrompt = null;
    window.dispatchEvent(new Event('agrigal-installed'));
  });
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it">
    <body>
      <Script id="agrigal-install-capture" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: installCapture }} />
      <PwaRuntime />
      {children}
    </body>
  </html>;
}
