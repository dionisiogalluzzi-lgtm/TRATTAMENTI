import { createActivityAction } from "@/app/actions";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtNumber } from "@/lib/utils";

const TYPES=["FERTILIZZAZIONE","IRRIGAZIONE","FERTIRRIGAZIONE","SEMINA","TRAPIANTO","POTATURA","LAVORAZIONE_SUOLO","SFALCIO","RACCOLTA","ALTRO"];

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ok?:string;error?:string}> }) {
  const {supabase}=await requireProfile(); const params=await searchParams;
  const [{data:activities},{data:companies},{data:fields}] = await Promise.all([
    supabase.from("activities").select("id,activity_date,activity_type,quantity,unit,direct_cost,notes,companies(name),fields(name,code),profiles!activities_operator_id_fkey(full_name)").order("activity_date",{ascending:false}).limit(100),
    supabase.from("companies").select("id,name").eq("active",true).order("name"),
    supabase.from("fields").select("id,code,name,company_id").eq("active",true).order("name"),
  ]);
  return <>
    <PageHeader eyebrow="LAVORI AGRICOLI" title="Attività di campo" description="Registra anche le operazioni diverse dai trattamenti: fertilizzazione, irrigazione, potatura, lavorazioni, raccolta e costi diretti." />
    <Feedback ok={params.ok} error={params.error} />
    <div className="two-col">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">REGISTRO</p><h2>Ultime attività</h2></div></div>{activities?.length?<div className="list">{activities.map((a:any)=><div className="list-item" key={a.id}><div><strong>{a.activity_type.replaceAll("_"," ")}</strong><p>{fmtDate(a.activity_date)} · {a.companies?.name}{a.fields?` · ${a.fields.code} ${a.fields.name}`:""}</p><p>{a.notes||""}</p></div><div style={{textAlign:"right"}}>{a.quantity!=null&&<strong>{fmtNumber(a.quantity,3)} {a.unit}</strong>}{a.direct_cost!=null&&<p>€ {fmtNumber(a.direct_cost)}</p>}</div></div>)}</div>:<EmptyState title="Nessuna attività" text="Le attività non fitosanitarie possono essere registrate qui. I trattamenti completati vengono inseriti automaticamente." />}</section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">NUOVA ATTIVITÀ</p><h2>Registra lavoro</h2></div></div>{companies?.length?<form action={createActivityAction} className="form-grid cols-2"><label>Azienda<select name="company_id" required><option value="">Seleziona</option>{companies.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Appezzamento<select name="field_id"><option value="">Generale</option>{fields?.map((f:any)=><option key={f.id} value={f.id}>{f.code} · {f.name}</option>)}</select></label><label>Tipo<select name="activity_type">{TYPES.map(t=><option key={t}>{t.replaceAll("_"," ")}</option>)}</select></label><label>Data<input type="date" name="activity_date" defaultValue={new Date().toISOString().slice(0,10)} required /></label><label>Quantità<input type="number" step="0.001" name="quantity" /></label><label>Unità<input name="unit" placeholder="kg, h, m³…" /></label><label>Costo diretto €<input type="number" step="0.01" name="direct_cost" /></label><label>Note<input name="notes" /></label><button className="btn primary span-2">Registra attività</button></form>:<div className="alert info">Non hai aziende disponibili.</div>}</section>
    </div>
  </>;
}
