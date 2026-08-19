"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __agrigalInstallPrompt?: BeforeInstallPromptEvent | null;
    __agrigalInstalled?: boolean;
  }
}

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}

export function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(Boolean(window.__agrigalInstalled || standalone));
    setPromptEvent(window.__agrigalInstallPrompt ?? null);

    const onReady = () => {
      setPromptEvent(window.__agrigalInstallPrompt ?? null);
      setShowHelp(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowHelp(false);
    };
    window.addEventListener("agrigal-install-ready", onReady);
    window.addEventListener("agrigal-installed", onInstalled);
    return () => {
      window.removeEventListener("agrigal-install-ready", onReady);
      window.removeEventListener("agrigal-installed", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    const current = promptEvent ?? window.__agrigalInstallPrompt ?? null;
    if (!current) {
      setShowHelp(true);
      return;
    }
    await current.prompt();
    const choice = await current.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
      setShowHelp(false);
    }
  }

  return <div className="pwa-install-wrap">
    <button type="button" className="pwa-install-button" onClick={install} title="Installa AGRIGAL sul dispositivo">↓ Installa</button>
    {showHelp && <div className="pwa-install-help" role="status">
      <strong>Chrome sta preparando l’installazione.</strong>
      <span>Resta su AGRIGAL almeno 30 secondi e tocca la pagina una volta. Poi premi di nuovo “Installa”. In alternativa apri ⋮ e scegli “Installa app” se compare.</span>
      <button type="button" onClick={() => setShowHelp(false)} aria-label="Chiudi istruzioni">×</button>
    </div>}
  </div>;
}
