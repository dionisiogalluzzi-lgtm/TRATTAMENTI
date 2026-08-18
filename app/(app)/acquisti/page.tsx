import { PurchaseCard } from "@/components/purchase-card";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtNumber, statusClass } from "@/lib/utils";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile(); const params=await searchParams;
  const [{data:ordersData},{data:suppliers}] = await Promise.all([
    supabase.from("purchase_orders").select("*,companies(name),suppliers(name),treatment_plans(title),purchase_order_lines(*,products(commercial_name))").order("created_at",{ascending:false}),
    supabase.from("suppliers").select("id,name").eq("active",true).order("name"),
  ]);
  const orders=ordersData??[]; const open=orders.filter((o:any)=>o.status!=="RICEVUTO"&&o.status!=="ANNULLATO"); const closed=orders.filter((o:any)=>o.status==="RICEVUTO");
  return <>
    <PageHeader eyebrow="APPROVVIGIONAMENTO" title="Acquisti" description="Gli ordini proposti possono nascere automaticamente dai fabbisogni scoperti. Alla ricezione vengono creati lotti e movimenti di carico per l'azienda proprietaria." />
    <Feedback ok={params.ok} error={params.error} />
    {profile.role==="ADMIN"&&open.length?<div className="stack xl-gap" style={{marginBottom:20}}>{open.map((o:any)=><PurchaseCard key={o.id} suppliers={(suppliers??[]) as any} order={{id:o.id,company:o.companies?.name,status:o.status,sourceTitle:o.treatment_plans?.title,supplier_id:o.supplier_id,document_number:o.document_number,lines:(o.purchase_order_lines??[]).map((l:any)=>({id:l.id,product:l.products?.commercial_name,product_id:l.product_id,quantity:Number(l.quantity),unit:l.unit,unit_price:l.unit_price,lot_number:l.lot_number,expiry_date:l.expiry_date}))}} />)}</div>:profile.role==="ADMIN"?<EmptyState title="Nessun ordine da ricevere" text="Quando un piano ha fabbisogni scoperti puoi generare ordini proposti dalla scheda trattamento." />:null}
    <section className="panel" style={{marginTop:18}}><div className="section-head"><div><p className="eyebrow">STORICO</p><h2>Ordini ricevuti</h2></div></div>{closed.length?<div className="table-wrap"><table><thead><tr><th>Data</th><th>Azienda</th><th>Documento</th><th>Fornitore</th><th>Righe</th><th>Stato</th></tr></thead><tbody>{closed.map((o:any)=><tr key={o.id}><td>{fmtDate(o.order_date)}</td><td>{o.companies?.name}</td><td>{o.document_number??"—"}</td><td>{o.suppliers?.name??"—"}</td><td>{(o.purchase_order_lines??[]).map((l:any)=><div key={l.id}>{l.products?.commercial_name}: {fmtNumber(l.quantity,5)} {l.unit}</div>)}</td><td><span className={statusClass(o.status)}>{o.status}</span></td></tr>)}</tbody></table></div>:<p className="muted">Nessun acquisto ricevuto.</p>}</section>
  </>;
}
