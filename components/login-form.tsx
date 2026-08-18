"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const fd = new FormData(event.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const fullName = String(fd.get("full_name") ?? "").trim();
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signError } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } },
      });
      if (signError) setError(signError.message);
      else if (data.session) {
        router.replace("/setup"); router.refresh();
      } else {
        setMessage("Account creato. Controlla l'email per confermare l'accesso, poi effettua il login.");
        setMode("login");
      }
    } else {
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) setError(signError.message);
      else {
        router.replace(search.get("next") || "/dashboard");
        router.refresh();
      }
    }
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <div className="brand-mark">A</div>
        <div><strong>AGRIGAL</strong><span>Quaderno di campagna</span></div>
      </div>
      <div className="auth-tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Accedi</button>
        <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">Crea account</button>
      </div>
      <form onSubmit={submit} className="stack">
        {mode === "signup" && <label>Nome e cognome<input name="full_name" autoComplete="name" required /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <button className="btn primary wide" disabled={busy}>{busy ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}</button>
      </form>
      <p className="microcopy">Accesso protetto con Supabase Auth. I dati aziendali sono separati tramite Row Level Security.</p>
    </div>
  );
}
