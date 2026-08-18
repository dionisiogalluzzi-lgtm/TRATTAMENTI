import { PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtNumber } from "@/lib/utils";

export default async function ReportsPage() {
  const {supabase}=await requireProfile();
  const [{data:costRows},{data:qdca},{data:activities}]=await Promise.all([
    supabase.from("v_cost_by_field").select("company_id,company_name,field_id,field_name,total_cost"),
    supabase.from("v_qdca_records").select("execution_id,company_id,company_name,field_id,field_name,product_id,product_name,quantity_used,unit,treated_area_ha,execution_date"),
    supabase.from("activities").select("activity_type,direct_cost,company_id,companies(name)")
  ]);
  const byField=new Map<string,{field:string;company:string;cost:number}>();
  for(const r of costRows??[]){const key=String(r.field_id);const x=byField.get(key)||{field:r.field_name??"—",company:r.company_name??"—",cost:0};x.cost+=Number(r.total_cost??0);byField.set(key,x)}
  const byProduct=new Map<string,{name:string;quantity:number;unit:string;applications:Set<string>}>();
  const treated=new Map<string,number>();
  for(const r of qdca??[]){
    const key=String(r.product_id);const x=byProduct.get(key)||{name:r.product_name??"—",quantity:0,unit:r.unit??"",applications:new Set<string>()};x.quantity+=Number(r.quantity_used??0);x.applications.add(`${r.execution_id}-${r.field_id}`);byProduct.set(key,x);
    treated.set(`${r.execution_id}-${r.field_id}`,Number(r.treated_area_ha??0));
  }
  const activityCost=(activities??[]).reduce((s:number,a:any)=>s+Number(a.direct_cost??0),0);
  const treatedArea=[...treated.values()].reduce((s,n)=>s+n,0);
  return <>
    <PageHeader eyebrow="ANALISI" title="Report e costi" description="Indicatori economici e agronomici derivati dai movimenti e dalle attività registrate. Nessun dato è duplicato manualmente." />
    <div className="stat-grid"><div className="stat-card"><span>Costi attività dirette</span><strong>€ {fmtNumber(activityCost)}</strong><small>lavorazioni censite</small></div><div className="stat-card"><span>Superficie trattata cumulata</span><strong>{fmtNumber(treatedArea,2)} ha</strong><small>interventi × appezzamento</small></div><div className="stat-card"><span>Prodotti impiegati</span><strong>{byProduct.size}</strong><small>nel quaderno digitale</small></div><div className="stat-card"><span>Appezzamenti con costi</span><strong>{byField.size}</strong><small>tracciabilità economica</small></div></div>
    <div className="two-col"><section className="panel"><div className="section-head"><div><p className="eyebrow">ECONOMIA</p><h2>Costi per appezzamento</h2></div></div>{byField.size?<div className="table-wrap"><table><thead><tr><th>Azienda</th><th>Appezzamento</th><th>Costo registrato</th></tr></thead><tbody>{[...byField.values()].sort((a,b)=>b.cost-a.cost).map((r,i)=><tr key={i}><td>{r.company}</td><td>{r.field}</td><td><strong>€ {fmtNumber(r.cost)}</strong></td></tr>)}</tbody></table></div>:<EmptyState title="Nessun costo" text="I costi appariranno dopo attività e trattamenti consuntivati con prezzi di acquisto." />}</section>
    <section className="panel"><div className="section-head"><div><p className="eyebrow">IMPIEGHI</p><h2>Prodotti utilizzati</h2></div></div>{byProduct.size?<div className="table-wrap"><table><thead><tr><th>Prodotto</th><th>Quantità</th><th>Applicazioni</th></tr></thead><tbody>{[...byProduct.values()].map((r,i)=><tr key={i}><td>{r.name}</td><td>{fmtNumber(r.quantity,5)} {r.unit}</td><td>{r.applications.size}</td></tr>)}</tbody></table></div>:<EmptyState title="Nessun impiego" text="Concludi un trattamento per alimentare le statistiche." />}</section></div>
  </>;
}
