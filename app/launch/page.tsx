"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LaunchPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      router.replace(data.session ? "/dashboard" : "/login");
      router.refresh();
    }).catch(() => {
      if (active) router.replace("/login");
    });
    return () => { active = false; };
  }, [router]);

  return <main className="auth-page" aria-live="polite">
    <div className="auth-card" style={{ textAlign: "center" }}>
      <img src="/agrigal-icon-192.png" alt="AGRIGAL" width="96" height="96" style={{ margin: "0 auto 16px", borderRadius: 24 }} />
      <h1 style={{ marginBottom: 8 }}>AGRIGAL</h1>
      <p className="muted">Avvio dell’app…</p>
    </div>
  </main>;
}
