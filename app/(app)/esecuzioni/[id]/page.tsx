import { notFound } from "next/navigation";
import { completeExecutionAction, saveExecutionAction } from "@/app/actions";
import { Feedback, PageHeader } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtNumber, statusClass } from "@/lib/utils";

export default async function ExecutionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params; const query = await searchParams;
  const { supabase } = await requireProfile();
  const { data } = await supabase.from("treatment_executions").select("*,treatment_plans(title,target_or_adversity),profiles(full_name),equipment(name),treatment_execution_fields(*,fields(code,name,companies(name))),treatment_execution_products(*,companies(name),products(commercial_name))").eq("id",id).single();
  if (!data) notFound();
  const e:any=data; const fields=e.treatment_execution_fields??[]; const products=e.treatment_execution_products??[]; const editable=["BOZZA","IN_CORSO"].includes(e.status);
  return <>
    <PageHeader eyebrow="SCHEDA OPERATORE" title={e.treatment_plans?.title??"Esecuzione trattamento"} description={`${e.treatment_plans?.target_or_adversity??"Intervento"} · ${e.profiles?.full_name??"Operatore"}`} actions={<span className={statusClass(e.status)}>{e.status.replaceAll("_"," ")}</span>} />
    <Feedback ok={query.ok} error={query.error} />
    <form action={saveExecutionAction.bind(null,id)} className="stack xl-gap">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">CONSUNTIVO</p><h2>Dati reali</h2></div></div><div className="form-grid cols-3">
        <label>Data esecuzione<input type="date" name="execution_date" defaultValue={e.execution_date} disabled={!editable} required /></label><label>Temperatura °C<input type="number" step="0.1" name="weather_temperature_c" defaultValue={e.weather_temperature_c??""} disabled={!editable} /></label><label>Umidità %<input type="number" step="0.1" name="weather_humidity_pct" defaultValue={e.weather_humidity_pct??""} disabled={!editable} /></label><label>Vento km/h<input type="number" step="0.1" name="weather_wind_kmh" defaultValue={e.weather_wind_kmh??""} disabled={!editable} /></label><label>Meteo / condizioni<input name="weather_notes" defaultValue={e.weather_notes??""} disabled={!editable} /></label><label>Note finali<input name="notes" defaultValue={e.notes??""} disabled={!editable} /></label>
      </div></section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">APPEZZAMENTI</p><h2>Orari e fase fenologica</h2></div></div><div className="table-wrap"><table><thead><tr><th>Appezzamento</th><th>Coltura</th><th>Area</th><th>Acqua</th><th>Inizio</th><th>Fine</th><th>BBCH</th></tr></thead><tbody>{fields.map((f:any)=><tr key={f.id}><td><strong>{f.fields?.code} · {f.fields?.name}</strong><span className="muted">{f.fields?.companies?.name}</span></td><td>{f.crop_name_snapshot??"—"}</td><td>{fmtNumber(f.treated_area_ha,4)} ha</td><td>{fmtNumber(f.water_l_ha)} L/ha</td><td><input type="time" name={`start_${f.id}`} defaultValue={f.start_time??""} disabled={!editable} /></td><td><input type="time" name={`end_${f.id}`} defaultValue={f.end_time??""} disabled={!editable} /></td><td><input name={`bbch_${f.id}`} defaultValue={f.bbch_stage??""} disabled={!editable} /></td></tr>)}</tbody></table></div></section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">PRODOTTI</p><h2>Quantità effettive</h2></div></div><div className="table-wrap"><table><thead><tr><th>Azienda</th><th>Prodotto</th><th>Dose prevista</th><th>Quantità usata</th><th>Carenza</th></tr></thead><tbody>{products.map((p:any)=><tr key={p.id}><td>{p.companies?.name}</td><td><strong>{p.product_name_snapshot}</strong><span className="muted">Aut. {p.authorization_number_snapshot??"—"}</span></td><td>{p.dose_actual?`${fmtNumber(p.dose_actual,5)} ${p.dose_unit} ${p.dose_basis==="PER_HL"?"/100 L":"/ha"}`:"—"}</td><td><div style={{display:"flex",gap:7,alignItems:"center"}}><input type="number" step="0.00001" min="0.00001" name={`qty_${p.id}`} defaultValue={p.quantity_used} disabled={!editable} /><span>{p.unit}</span></div></td><td>{p.preharvest_interval_days_snapshot??"—"} gg</td></tr>)}</tbody></table></div></section>
      {editable&&<div className="sticky-actions"><span>Salva le quantità realmente impiegate prima di chiudere. La chiusura scarica le scorte e congela i dati del quaderno.</span><button className="btn primary">Salva consuntivo</button></div>}
    </form>
    {editable&&<section className="panel" style={{marginTop:18}}><div className="section-head"><div><p className="eyebrow">CHIUSURA</p><h2>Completa trattamento</h2></div></div><p className="muted">Operazione definitiva: crea gli scarichi di magazzino e rende la registrazione disponibile nel quaderno digitale.</p><form action={completeExecutionAction.bind(null,id)}><button className="btn accent">Completa e scarica magazzino</button></form></section>}
  </>;
}
