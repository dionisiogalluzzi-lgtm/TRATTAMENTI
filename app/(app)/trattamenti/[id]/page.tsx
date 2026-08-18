import Link from "next/link";
import { notFound } from "next/navigation";
import { createPurchasesFromPlanAction, refreshPlanAction, startExecutionAction } from "@/app/actions";
import { Feedback, PageHeader } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtNumber, statusClass } from "@/lib/utils";

export default async function TreatmentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, profile, userId } = await requireProfile();
  const { data: plan } = await supabase.from("treatment_plans").select("*,profiles!treatment_plans_assigned_operator_id_fkey(full_name),equipment(name,capacity_l),treatment_plan_fields(id,row_mode,treated_fraction,treated_area_ha,water_l_ha,fields(id,code,name,area_ha,companies(id,name)),crop_cycles(id,variety,current_bbch,crops(name))),treatment_plan_products(id,dose_amount,dose_basis,dose_unit,products(id,commercial_name,authorization_number,base_unit)),plan_requirements(id,company_id,product_id,required_qty,available_qty,shortage_qty,companies(name),products(commercial_name,base_unit)),purchase_orders(id,status,companies(name))").eq("id", id).single();
  if (!plan) notFound();
  const fields = (plan as any).treatment_plan_fields ?? [];
  const products = (plan as any).treatment_plan_products ?? [];
  const requirements = (plan as any).plan_requirements ?? [];
  const orders = (plan as any).purchase_orders ?? [];
  const totalArea = fields.reduce((s:number,f:any)=>s+Number(f.treated_area_ha??0),0);
  const shortageCount = requirements.filter((r:any)=>Number(r.shortage_qty)>0).length;
  const canStart = ["PRONTO","PIANIFICATO"].includes((plan as any).status) && (profile.role === "ADMIN" || (plan as any).assigned_operator_id === userId);
  return <>
    <PageHeader eyebrow="PIANO DI TRATTAMENTO" title={(plan as any).title} description={`${fmtDate((plan as any).planned_date)} · ${(plan as any).target_or_adversity || "Obiettivo non specificato"}`} actions={<div className="actions-row"><Link className="btn" href="/trattamenti">← Elenco</Link>{canStart&&<form action={startExecutionAction.bind(null,id)}><button className="btn primary">Avvia esecuzione</button></form>}</div>} />
    <Feedback ok={query.ok} error={query.error} />
    <div className="kpi-line" style={{marginBottom:18}}><div><span>Stato</span><strong><span className={statusClass((plan as any).status)}>{String((plan as any).status).replaceAll("_"," ")}</span></strong></div><div><span>Superficie trattata</span><strong>{fmtNumber(totalArea,4)} ha</strong></div><div><span>Operatore</span><strong>{(plan as any).profiles?.full_name??"Da assegnare"}</strong></div><div><span>Attrezzatura</span><strong>{(plan as any).equipment?.name??"Da scegliere"}</strong></div><div><span>Prodotti</span><strong>{products.length}</strong></div></div>
    <div className="detail-grid">
      <div className="stack">
        <section className="panel"><div className="section-head"><div><p className="eyebrow">SUPERFICI</p><h2>Appezzamenti</h2></div></div><div className="table-wrap"><table><thead><tr><th>Azienda / appezzamento</th><th>Coltura</th><th>Modalità</th><th>Acqua</th><th>Area trattata</th></tr></thead><tbody>{fields.map((f:any)=><tr key={f.id}><td><strong>{f.fields?.code} · {f.fields?.name}</strong><span className="muted">{f.fields?.companies?.name}</span></td><td>{f.crop_cycles?.crops?.name??"—"}{f.crop_cycles?.variety?` / ${f.crop_cycles.variety}`:""}</td><td>{f.row_mode.replaceAll("_"," ")}</td><td>{fmtNumber(f.water_l_ha)} L/ha</td><td>{fmtNumber(f.treated_area_ha,4)} ha</td></tr>)}</tbody></table></div></section>
        <section className="panel"><div className="section-head"><div><p className="eyebrow">RICETTA</p><h2>Prodotti</h2></div></div><div className="table-wrap"><table><thead><tr><th>Prodotto</th><th>Autorizzazione</th><th>Dose</th></tr></thead><tbody>{products.map((p:any)=><tr key={p.id}><td><strong>{p.products?.commercial_name}</strong></td><td>{p.products?.authorization_number??"—"}</td><td>{fmtNumber(p.dose_amount,5)} {p.dose_unit} {p.dose_basis==="PER_HL"?"/ 100 L":"/ ha"}</td></tr>)}</tbody></table></div></section>
      </div>
      <div className="stack">
        <section className="panel"><div className="section-head"><div><p className="eyebrow">FABBISOGNI</p><h2>Per azienda</h2></div>{shortageCount>0?<span className="badge warning">{shortageCount} carenze</span>:<span className="badge success">COPERTO</span>}</div>
          <div className="list">{requirements.length?requirements.map((r:any)=><div className="list-item" key={r.id}><div><strong>{r.products?.commercial_name}</strong><p>{r.companies?.name}</p></div><div style={{textAlign:"right"}}><strong>{fmtNumber(r.required_qty,5)} {r.products?.base_unit}</strong><p className={Number(r.shortage_qty)>0?"line-negative":"line-positive"}>{Number(r.shortage_qty)>0?`mancano ${fmtNumber(r.shortage_qty,5)}`:`disp. ${fmtNumber(r.available_qty,5)}`}</p></div></div>):<p className="muted">Fabbisogni non ancora calcolati.</p>}</div>
          {profile.role==="ADMIN"&&<div className="actions-row" style={{marginTop:14}}><form action={refreshPlanAction.bind(null,id)}><button className="btn">Ricalcola</button></form>{shortageCount>0&&<form action={createPurchasesFromPlanAction.bind(null,id)}><button className="btn accent">Genera acquisti</button></form>}</div>}
        </section>
        <section className="panel"><div className="section-head"><div><p className="eyebrow">ACQUISTI</p><h2>Ordini collegati</h2></div></div>{orders.length?<div className="list">{orders.map((o:any)=><Link href="/acquisti" className="list-item" key={o.id}><div><strong>{o.companies?.name}</strong><p>Ordine proposto dal piano</p></div><span className={statusClass(o.status)}>{o.status}</span></Link>)}</div>:<p className="muted">Nessun ordine generato.</p>}</section>
      </div>
    </div>
  </>;
}
