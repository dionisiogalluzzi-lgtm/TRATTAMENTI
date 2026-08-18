import { redirect } from "next/navigation";
import { claimInitialAdminAction } from "@/app/actions";
import { Feedback, PageHeader } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { profile } = await requireProfile();
  if (profile.role === "ADMIN") redirect("/dashboard");
  const params = await searchParams;
  return <div className="setup-wrap">
    <PageHeader eyebrow="PRIMA ATTIVAZIONE" title="Attiva l'amministratore" description="Il primo amministratore viene attivato con un codice monouso. Gli altri account restano OPERATORI finché non vengono autorizzati." />
    <Feedback ok={params.ok} error={params.error} />
    <section className="panel stack">
      <div className="alert info">Questa protezione evita che un account creato da terzi possa diventare amministratore soltanto perché è il primo a registrarsi.</div>
      <form action={claimInitialAdminAction} className="stack">
        <label>Codice di attivazione ADMIN<input className="setup-code" name="code" autoComplete="off" required placeholder="AGRIGAL-…" /></label>
        <button className="btn primary">Attiva ruolo ADMIN</button>
      </form>
    </section>
  </div>;
}
