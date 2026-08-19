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
  const [standalone, setStandalone] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => setStandalone(media.matches);
    syncStandalone();
    setPromptEvent(window.__agrigalInstallPrompt ?? null);

    const onReady = () => {
      setPromptEvent(window.__agrigalInstallPrompt ?? null);
      setShowHelp(false);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setShowHelp(false);
    };

    media.addEventListener?.("change", syncStandalone);
    window.addEventListener("agrigal-install-ready", onReady);
    window.addEventListener("agrigal-installed", onInstalled);
    return () => {
      media.removeEventListener?.("change", syncStandalone);
      window.removeEventListener("agrigal-install-ready", onReady);
      window.removeEventListener("agrigal-installed", onInstalled);
    };
  }, []);

  if (standalone) return null;

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
      <strong>AGRIGAL non è ancora pronta per il prompt automatico.</strong>
      <span>Chrome richiede almeno un’interazione con la pagina e circa 30 secondi di utilizzo prima di proporre l’installazione. Tocca la pagina, attendi un momento e premi di nuovo “Installa”. Se nel menu ⋮ compare “Installa app”, puoi usare anche quello.</span>
      <button type="button" onClick={() => setShowHelp(false)} aria-label="Chiudi istruzioni">×</button>
    </div>}
  </div>;
}
