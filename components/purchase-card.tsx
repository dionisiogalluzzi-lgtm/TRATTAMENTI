"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Line = { id:string; product:string; product_id:string; quantity:number; unit:string; unit_price:number|null; lot_number:string|null; expiry_date:string|null };
type Supplier = { id:string; name:string };

export function PurchaseCard({ order, suppliers }: { order:any; suppliers:Supplier[] }) {
  const router=useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const lines:Line[]=order.lines;
  async function receive(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const fd=new FormData(e.currentTarget);const supabase=createClient();
    const {error:orderError}=await supabase.from("purchase_orders").update({supplier_id:String(fd.get("supplier_id")||"")||null,document_number:String(fd.get("document_number")||"")||null,status:"ORDINATO"}).eq("id",order.id);
    if(orderError){setError(orderError.message);setBusy(false);return;}
    for(const l of lines){const price=String(fd.get(`price_${l.id}`)||"");const lot=String(fd.get(`lot_${l.id}`)||"");const expiry=String(fd.get(`expiry_${l.id}`)||"");const {error:lineError}=await supabase.from("purchase_order_lines").update({unit_price:price?Number(price):null,lot_number:lot||null,expiry_date:expiry||null}).eq("id",l.id);if(lineError){setError(lineError.message);setBusy(false);return;}}
    const {error:rpcError}=await supabase.rpc("receive_purchase_order",{p_order_id:order.id});if(rpcError){setError(rpcError.message);setBusy(false);return;}router.refresh();setBusy(false);
  }
  return <form onSubmit={receive} className="panel stack"><div className="section-head"><div><p className="eyebrow">{order.company}</p><h2>Ordine {order.status}</h2><p className="muted">{order.sourceTitle||"Acquisto manuale"}</p></div><span className="badge warning">{order.status}</span></div>
    <div className="form-grid cols-2"><label>Fornitore<select name="supplier_id" defaultValue={order.supplier_id||""}><option value="">Da definire</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Documento / DDT<input name="document_number" defaultValue={order.document_number||""} /></label></div>
    <div className="table-wrap"><table><thead><tr><th>Prodotto</th><th>Quantità</th><th>Prezzo unit.</th><th>Lotto</th><th>Scadenza</th></tr></thead><tbody>{lines.map(l=><tr key={l.id}><td><strong>{l.product}</strong></td><td>{l.quantity} {l.unit}</td><td><input name={`price_${l.id}`} type="number" min="0" step="0.0001" defaultValue={l.unit_price??""} /></td><td><input name={`lot_${l.id}`} defaultValue={l.lot_number??""} /></td><td><input name={`expiry_${l.id}`} type="date" defaultValue={l.expiry_date??""} /></td></tr>)}</tbody></table></div>
    {error&&<div className="alert error">{error}</div>}<button className="btn primary" disabled={busy}>{busy?"Registrazione…":"Ricevi ordine e carica magazzino"}</button>
  </form>;
}
