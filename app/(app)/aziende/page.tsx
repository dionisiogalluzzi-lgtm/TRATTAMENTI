import { createCompanyAction } from "@/app/actions";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const { data } = await supabase.from("companies").select("*").order("name");
  const companies = data ?? [];
  return <>
    <PageHeader eyebrow="MULTIAZIENDA" title="Aziende agricole" description="Ogni giacenza, appezzamento, costo e registrazione resta attribuito alla corretta ragione sociale." />
    <Feedback ok={params.ok} error={params.error} />
    <div className="two-col">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">ANAGRAFICA</p><h2>Aziende configurate</h2></div></div>
        {companies.length ? <div className="list">{companies.map((c:any)=><div className="list-item" key={c.id}><div><strong>{c.name}</strong><p>{[c.short_name,c.cuaa && `CUAA ${c.cuaa}`,c.city,c.province].filter(Boolean).join(" · ") || "Anagrafica essenziale"}</p></div><span className={c.active ? "badge success" : "badge"}>{c.active ? "ATTIVA" : "INATTIVA"}</span></div>)}</div> : <EmptyState title="Nessuna azienda" text="Inserisci le quattro aziende agricole da gestire. Il magazzino resterà fisicamente unico ma le scorte saranno separate per proprietà." />}
      </section>
      {profile.role === "ADMIN" && <section className="panel"><div className="section-head"><div><p className="eyebrow">NUOVA AZIENDA</p><h2>Inserisci anagrafica</h2></div></div>
        <form action={createCompanyAction} className="form-grid cols-2">
          <label className="span-2">Ragione sociale<input name="name" required /></label>
          <label>Nome breve<input name="short_name" /></label><label>CUAA<input name="cuaa" /></label>
          <label>Partita IVA<input name="vat_number" /></label><label>Codice fiscale<input name="tax_code" /></label>
          <label className="span-2">Indirizzo<input name="address" /></label>
          <label>Città<input name="city" /></label><label>Provincia<input name="province" maxLength={2} /></label>
          <label>Regione<input name="region" /></label><label>Note<input name="notes" /></label>
          <button className="btn primary span-2">Salva azienda</button>
        </form>
      </section>}
    </div>
  </>;
}
