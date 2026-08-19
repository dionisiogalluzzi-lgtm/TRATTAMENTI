import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtNumber } from "@/lib/utils";

export default async function QdcaPage({ searchParams }: { searchParams: Promise<{ company?: string; from?: string; to?: string; mode?: string }> }) {
  const { supabase } = await requireProfile();
  const q = await searchParams;
  const mode = q.mode === "conforme" ? "conforme" : "reale";
  const { data: companies } = await supabase.from("companies").select("id,name").order("name");
  let builder = supabase.from("v_qdca_records").select("*").order("execution_date",{ascending:false});
  if (q.company) builder=builder.eq("company_id",q.company);
  if (q.from) builder=builder.gte("execution_date",q.from);
  if (q.to) builder=builder.lte("execution_date",q.to);
  if (mode === "conforme") builder=builder.eq("compliance_status","CONFORME");
  const { data } = await builder.limit(500);
  const rows=data??[];
  const nonCompliantCount = rows.filter((r:any)=>r.compliance_status === "NON_CONFORME").length;
  const exportParams=new URLSearchParams();
  if(q.company)exportParams.set("company",q.company);
  if(q.from)exportParams.set("from",q.from);
  if(q.to)exportParams.set("to",q.to);
  exportParams.set("mode", mode);
  const preserved = new URLSearchParams();
  if(q.company)preserved.set("company",q.company);
  if(q.from)preserved.set("from",q.from);
  if(q.to)preserved.set("to",q.to);
  const realHref = `/quaderno?${new URLSearchParams([...preserved.entries(), ["mode","reale"]]).toString()}`;
  const conformHref = `/quaderno?${new URLSearchParams([...preserved.entries(), ["mode","conforme"]]).toString()}`;

  return <>
    <div className="qdca-banner"><div><p className="eyebrow">REGISTRO ELETTRONICO</p><h1 style={{margin:0}}>Quaderno di campagna digitale</h1><p>Registro machine-readable con localizzazione, superficie, EPPO/BBCH, prodotto e autorizzazione, quantità, dose e stato di conformità alle regole di etichetta censite.</p></div><a className="btn accent" href={`/api/export/qdca?${exportParams.toString()}`}>↓ {mode === "conforme" ? "Esporta vista conforme" : "Esporta registro reale"}</a></div>
    <PageHeader title="Registro trattamenti" description="I dati derivano dalle esecuzioni completate e conservano snapshot storici. Le forzature restano tracciate e non vengono cancellate dallo storico reale." />

    <div className="actions-row" style={{marginBottom:18}}>
      <Link className={mode === "reale" ? "btn primary" : "btn"} href={realHref}>Quaderno reale / bozza</Link>
      <Link className={mode === "conforme" ? "btn primary" : "btn"} href={conformHref}>Vista conforme</Link>
    </div>

    {mode === "reale" ? <div className="alert info" style={{marginBottom:18}}>
      <strong>Registro reale completo.</strong> Mostra tutte le applicazioni effettivamente registrate. Le applicazioni forzate fuori etichetta restano visibili con stato NON CONFORME e motivazione.
      {nonCompliantCount > 0 && <span className="badge danger" style={{marginLeft:10}}>{nonCompliantCount} NON CONFORMI</span>}
    </div> : <div className="alert warning" style={{marginBottom:18}}>
      <strong>Vista conforme filtrata.</strong> Mostra solo le righe senza controlli BLOCKING. È una vista di supporto interno e non sostituisce il registro integrale degli impieghi realmente effettuati.
    </div>}

    <form className="panel inline-fields" style={{marginBottom:18}} method="get"><input type="hidden" name="mode" value={mode} /><label>Azienda<select name="company" defaultValue={q.company??""}><option value="">Tutte</option>{companies?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Dal<input type="date" name="from" defaultValue={q.from??""} /></label><label>Al<input type="date" name="to" defaultValue={q.to??""} /></label><div style={{alignSelf:"end"}}><button className="btn primary">Filtra</button></div></form>
    {rows.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Azienda / area</th><th>Coltura</th><th>Prodotto</th><th>Dose standard</th><th>Quantità</th><th>Conformità</th><th>Operatore</th><th>Carenza</th></tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={`${r.execution_id}-${r.field_id}-${r.product_id}-${i}`}><td>{fmtDate(r.execution_date)}<br/><span className="muted">{[r.start_time,r.end_time].filter(Boolean).join("–")}</span></td><td><strong>{r.company_name}</strong><span className="muted">{r.field_code} · {r.field_name} · {fmtNumber(r.treated_area_ha,4)} ha</span><span className="muted">{r.geospatial_aid_unit ? `Unità: ${r.geospatial_aid_unit}` : "Identificazione alternativa"}</span></td><td>{r.crop_name??"—"}<br/><span className="muted">EPPO {r.eppo_code??"—"} · BBCH {r.bbch_stage??"—"}</span></td><td><strong>{r.product_name}</strong><span className="muted">Aut. {r.authorization_number??"—"}</span></td><td>{r.standardized_rate_per_ha!=null?`${fmtNumber(r.standardized_rate_per_ha,5)} ${r.standardized_rate_unit}`:r.dose_actual?`${fmtNumber(r.dose_actual,5)} ${r.dose_unit}`:"—"}</td><td>{fmtNumber(r.quantity_used,5)} {r.unit}</td><td>{r.compliance_status === "NON_CONFORME" ? <><span className="badge danger">NON CONFORME</span>{r.compliance_issue_messages && <span className="muted">{r.compliance_issue_messages}</span>}{r.compliance_override_reason && <span className="muted"><strong>Forzatura:</strong> {r.compliance_override_reason}</span>}</> : <span className="badge success">CONFORME</span>}</td><td>{r.operator_name??"—"}</td><td>{r.preharvest_interval_days??"—"} gg</td></tr>)}</tbody></table></div> : <EmptyState title={mode === "conforme" ? "Nessuna riga conforme nel periodo" : "Registro ancora vuoto"} text={mode === "conforme" ? "Prova ad ampliare il periodo o passa al Quaderno reale / bozza." : "Le righe del quaderno compaiono automaticamente quando un trattamento viene completato."} />}
  </>;
}
