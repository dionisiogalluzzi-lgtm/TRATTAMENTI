import { createFieldAction } from "@/app/field-actions";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtNumber } from "@/lib/utils";

export default async function FieldsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const [{ data: fieldsData }, { data: companies }, { data: crops }] = await Promise.all([
    supabase.from("fields").select("*,companies(name),crop_cycles(id,variety,current_bbch,active,cultivation_method,crops(name,kind))").order("name"),
    supabase.from("companies").select("id,name").eq("active",true).order("name"),
    supabase.from("crops").select("id,name,kind").eq("active",true).order("name"),
  ]);
  const fields = fieldsData ?? [];
  return <>
    <PageHeader eyebrow="SUPERFICI" title="Appezzamenti e colture" description="La superficie anagrafica resta fissa; i cicli colturali conservano lo storico. È disponibile anche l'identificativo dell'unità geospaziale/di domanda aiuto per il registro digitale." />
    <Feedback ok={params.ok} error={params.error} />
    <div className="two-col">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">CATASTO OPERATIVO</p><h2>{fields.length} appezzamenti</h2></div></div>
        {fields.length ? <div className="list">{fields.map((f:any)=>{const cycles=(f.crop_cycles??[]).filter((c:any)=>c.active);const c=cycles[0];return <div className="list-item" key={f.id}><div><strong>{f.code} · {f.name}</strong><p>{f.companies?.name} · {c?.crops?.name ?? "Coltura da impostare"}{c?.variety ? ` / ${c.variety}` : ""}{c?.current_bbch ? ` · BBCH ${c.current_bbch}` : ""}</p><p>{f.geospatial_aid_unit ? `Unità geospaziale: ${f.geospatial_aid_unit}` : f.cadastral_refs || "Localizzazione da completare"}</p></div><div style={{textAlign:"right"}}><strong>{fmtNumber(f.area_ha,4)} ha</strong><span className={f.active?"badge success":"badge"}>{f.active?"ATTIVO":"CHIUSO"}</span></div></div>})}</div> : <EmptyState title="Nessun appezzamento" text="Dopo aver creato le aziende, inserisci appezzamenti, superfici, identificazione territoriale e colture correnti." />}
      </section>
      {profile.role === "ADMIN" && <section className="panel"><div className="section-head"><div><p className="eyebrow">NUOVO APPEZZAMENTO</p><h2>Superficie + ciclo colturale</h2></div></div>
        {!(companies?.length) ? <div className="alert info">Crea prima almeno un'azienda.</div> : <form action={createFieldAction} className="form-grid cols-2">
          <label>Azienda<select name="company_id" required><option value="">Seleziona</option>{companies?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Codice<input name="code" required placeholder="es. VIG-01" /></label>
          <label>Nome<input name="name" required /></label><label>Superficie ha<input name="area_ha" type="number" step="0.0001" min="0.0001" required /></label>
          <label>Comune<input name="municipality" /></label><label>Provincia<input name="province" maxLength={2} /></label>
          <label className="span-2">Unità geospaziale / domanda aiuto<input name="geospatial_aid_unit" placeholder="Identificativo ufficiale, se disponibile" /></label>
          <label className="span-2">Riferimenti catastali<input name="cadastral_refs" placeholder="Foglio / particella" /></label>
          <label>Coltura<select name="crop_id"><option value="">Nessuna</option>{crops?.map((c:any)=><option key={c.id} value={c.id}>{c.name} · {c.kind}</option>)}</select></label>
          <label>Varietà<input name="variety" /></label>
          <label>Inizio ciclo<input name="start_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label>
          <label>Metodo<select name="cultivation_method"><option>CONVENZIONALE</option><option>INTEGRATA</option><option>BIOLOGICO</option></select></label>
          <label>Fase BBCH<input name="current_bbch" placeholder="es. 65" /></label><label>Note<input name="notes" /></label>
          <button className="btn primary span-2">Crea appezzamento</button>
        </form>}
      </section>}
    </div>
  </>;
}
