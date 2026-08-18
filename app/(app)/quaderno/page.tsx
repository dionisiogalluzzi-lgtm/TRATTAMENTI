import { PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtNumber } from "@/lib/utils";

export default async function QdcaPage({ searchParams }: { searchParams: Promise<{ company?: string; from?: string; to?: string }> }) {
  const { supabase } = await requireProfile();
  const q = await searchParams;
  const { data: companies } = await supabase.from("companies").select("id,name").order("name");
  let builder = supabase.from("v_qdca_records").select("*").order("execution_date",{ascending:false});
  if (q.company) builder=builder.eq("company_id",q.company);
  if (q.from) builder=builder.gte("execution_date",q.from);
  if (q.to) builder=builder.lte("execution_date",q.to);
  const { data } = await builder.limit(500);
  const rows=data??[];
  const exportParams=new URLSearchParams(); if(q.company)exportParams.set("company",q.company);if(q.from)exportParams.set("from",q.from);if(q.to)exportParams.set("to",q.to);
  return <>
    <div className="qdca-banner"><div><p className="eyebrow">QDCA READY</p><h1 style={{margin:0}}>Quaderno di campagna digitale</h1><p>Registro strutturato delle applicazioni: azienda, data, area trattata, coltura, prodotto e autorizzazione, dose, quantità, operatore, attrezzatura, meteo e intervallo di carenza.</p></div><a className="btn accent" href={`/api/export/qdca?${exportParams.toString()}`}>↓ Esporta CSV</a></div>
    <PageHeader title="Registro trattamenti" description="I dati derivano dalle esecuzioni completate e conservano snapshot storici, così le modifiche future alle anagrafiche non alterano il registro già consuntivato." />
    <form className="panel inline-fields" style={{marginBottom:18}} method="get"><label>Azienda<select name="company" defaultValue={q.company??""}><option value="">Tutte</option>{companies?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Dal<input type="date" name="from" defaultValue={q.from??""} /></label><label>Al<input type="date" name="to" defaultValue={q.to??""} /></label><div style={{alignSelf:"end"}}><button className="btn primary">Filtra</button></div></form>
    {rows.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Azienda / appezzamento</th><th>Coltura</th><th>Prodotto</th><th>Dose</th><th>Quantità</th><th>Operatore</th><th>Carenza</th></tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={`${r.execution_id}-${r.field_id}-${r.product_id}-${i}`}><td>{fmtDate(r.execution_date)}<br/><span className="muted">{[r.start_time,r.end_time].filter(Boolean).join("–")}</span></td><td><strong>{r.company_name}</strong><span className="muted">{r.field_code} · {r.field_name} · {fmtNumber(r.treated_area_ha,4)} ha</span></td><td>{r.crop_name??"—"}<br/><span className="muted">BBCH {r.bbch_stage??"—"}</span></td><td><strong>{r.product_name}</strong><span className="muted">Aut. {r.authorization_number??"—"}</span></td><td>{r.dose_actual?`${fmtNumber(r.dose_actual,5)} ${r.dose_unit} ${r.dose_basis==="PER_HL"?"/100 L":"/ha"}`:"—"}</td><td>{fmtNumber(r.quantity_used,5)} {r.unit}</td><td>{r.operator_name??"—"}</td><td>{r.preharvest_interval_days??"—"} gg</td></tr>)}</tbody></table></div> : <EmptyState title="Registro ancora vuoto" text="Le righe del quaderno compaiono automaticamente quando un trattamento viene completato." />}
  </>;
}
