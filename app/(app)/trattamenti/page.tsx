import Link from "next/link";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, statusClass } from "@/lib/utils";

export default async function TreatmentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const { data } = await supabase.from("treatment_plans").select("id,title,planned_date,status,target_or_adversity,profiles!treatment_plans_assigned_operator_id_fkey(full_name),equipment(name),treatment_plan_fields(id,treated_area_ha),plan_requirements(shortage_qty)").order("planned_date",{ascending:false}).limit(100);
  const plans = data ?? [];
  return <>
    <PageHeader eyebrow="DIFESA E NUTRIZIONE" title="Piani di trattamento" description="Dalla ricetta al fabbisogno, dagli acquisti all'esecuzione: un flusso unico con controllo scorte per azienda." actions={profile.role==="ADMIN"?<Link className="btn primary" href="/trattamenti/nuovo">+ Nuovo trattamento</Link>:undefined} />
    <Feedback ok={params.ok} error={params.error} />
    {plans.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Piano</th><th>Stato</th><th>Superficie</th><th>Operatore</th><th>Fabbisogno</th></tr></thead><tbody>{plans.map((p:any)=>{const area=(p.treatment_plan_fields??[]).reduce((s:number,r:any)=>s+Number(r.treated_area_ha??0),0);const shortage=(p.plan_requirements??[]).reduce((s:number,r:any)=>s+Number(r.shortage_qty??0),0);return <tr key={p.id}><td>{fmtDate(p.planned_date)}</td><td><Link href={`/trattamenti/${p.id}`}><strong>{p.title}</strong><span className="muted">{p.target_or_adversity||"Nessuna avversità specificata"}</span></Link></td><td><span className={statusClass(p.status)}>{p.status.replaceAll("_"," ")}</span></td><td>{area.toFixed(2)} ha</td><td>{p.profiles?.full_name??"Da assegnare"}</td><td className={shortage>0?"line-negative":"line-positive"}>{shortage>0?"Da acquistare":"Coperto"}</td></tr>})}</tbody></table></div> : <EmptyState title="Nessun trattamento" text={profile.role==="ADMIN"?"Pianifica il primo intervento selezionando uno o più appezzamenti e una ricetta multi-prodotto.":"Non hai trattamenti assegnati."} action={profile.role==="ADMIN"?<Link href="/trattamenti/nuovo" className="btn primary">Crea piano</Link>:undefined} />}
  </>;
}
