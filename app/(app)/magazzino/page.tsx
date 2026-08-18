import { createInitialStockAction, createTransferAction } from "@/app/warehouse-actions";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { fmtDateTime, fmtNumber } from "@/lib/utils";

export default async function WarehousePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const [{ data: balances }, { data: movements }, { data: companies }, { data: products }, { data: warehouses }] = await Promise.all([
    supabase.from("v_stock_balance").select("company_id,product_id,warehouse_id,unit,quantity,company_name,product_name,warehouse_name").order("company_name"),
    supabase.from("stock_movements").select("id,occurred_at,movement_type,quantity,unit,document_number,companies(name),products(commercial_name)").order("occurred_at", { ascending:false }).limit(20),
    supabase.from("companies").select("id,name").eq("active",true).order("name"),
    supabase.from("products").select("id,commercial_name,base_unit").eq("active",true).order("commercial_name"),
    supabase.from("warehouses").select("id,name").eq("active",true).order("name"),
  ]);
  return <>
    <PageHeader eyebrow="SCORTE" title="Magazzino fitofarmaci" description="Un solo magazzino fisico, proprietà delle giacenze separata per azienda. Ogni variazione è un movimento storico: nessuna giacenza viene sovrascritta." />
    <Feedback ok={params.ok} error={params.error} />
    <div className="stat-grid">
      <div className="stat-card"><span>Posizioni di stock</span><strong>{balances?.length ?? 0}</strong><small>azienda × prodotto</small></div>
      <div className="stat-card"><span>Movimenti recenti</span><strong>{movements?.length ?? 0}</strong><small>ultimi caricati</small></div>
      <div className="stat-card"><span>Magazzini fisici</span><strong>{warehouses?.length ?? 0}</strong><small>condivisi</small></div>
      <div className="stat-card"><span>Prodotti censiti</span><strong>{products?.length ?? 0}</strong><small>catalogo attivo</small></div>
    </div>
    <section className="panel" style={{marginBottom:18}}><div className="section-head"><div><p className="eyebrow">GIACENZE</p><h2>Disponibilità per azienda</h2></div></div>
      {balances?.length ? <div className="table-wrap"><table><thead><tr><th>Azienda</th><th>Prodotto</th><th>Quantità</th><th>Unità</th></tr></thead><tbody>{balances.map((b:any)=><tr key={`${b.company_id}-${b.product_id}-${b.warehouse_id}-${b.unit}`}><td>{b.company_name}</td><td><strong>{b.product_name}</strong></td><td className={Number(b.quantity)<=0?"line-negative":"line-positive"}><strong>{fmtNumber(b.quantity,5)}</strong></td><td>{b.unit}</td></tr>)}</tbody></table></div> : <EmptyState title="Magazzino vuoto" text="Registra le giacenze iniziali o ricevi un ordine di acquisto per iniziare." />}
    </section>
    {profile.role === "ADMIN" && <div className="two-col">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">CARICO INIZIALE</p><h2>Registra giacenza</h2></div></div><form action={createInitialStockAction} className="form-grid cols-2">
        <label>Magazzino<select name="warehouse_id" required>{warehouses?.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>Azienda<select name="company_id" required><option value="">Seleziona</option>{companies?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="span-2">Prodotto<select name="product_id" required><option value="">Seleziona</option>{products?.map((p:any)=><option key={p.id} value={p.id}>{p.commercial_name} · {p.base_unit}</option>)}</select></label><label>Quantità<input type="number" name="quantity" step="0.00001" min="0.00001" required /></label><label>Unità<div className="metric-inline">Automatica dal prodotto</div></label><label>Lotto<input name="lot_number" /></label><label>Scadenza<input name="expiry_date" type="date" /></label><label>Costo unitario €<input name="unit_cost" type="number" step="0.0001" /></label><label>Documento<input name="document_number" /></label><label className="span-2">Note<input name="notes" /></label><button className="btn primary span-2">Registra movimento</button>
      </form></section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">INTERAZIENDALE</p><h2>Trasferisci proprietà</h2></div></div><form action={createTransferAction} className="form-grid cols-2">
        <input type="hidden" name="warehouse_id" value={warehouses?.[0]?.id ?? ""} /><label>Da azienda<select name="from_company_id" required><option value="">Seleziona</option>{companies?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>A azienda<select name="to_company_id" required><option value="">Seleziona</option>{companies?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="span-2">Prodotto<select name="product_id" required><option value="">Seleziona</option>{products?.map((p:any)=><option key={p.id} value={p.id}>{p.commercial_name} · {p.base_unit}</option>)}</select></label><label>Quantità<input name="quantity" type="number" min="0.00001" step="0.00001" required /></label><label>Unità<div className="metric-inline">Automatica dal prodotto</div></label><label className="span-2">Note<input name="notes" /></label><button className="btn primary span-2">Trasferisci e registra</button>
      </form></section>
    </div>}
    <section className="panel" style={{marginTop:18}}><div className="section-head"><div><p className="eyebrow">REGISTRO</p><h2>Ultimi movimenti</h2></div></div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Azienda</th><th>Prodotto</th><th>Causale</th><th>Quantità</th></tr></thead><tbody>{movements?.map((m:any)=><tr key={m.id}><td>{fmtDateTime(m.occurred_at)}</td><td>{m.companies?.name}</td><td>{m.products?.commercial_name}</td><td>{m.movement_type.replaceAll("_"," ")}</td><td className={Number(m.quantity)<0?"line-negative":"line-positive"}>{fmtNumber(m.quantity,5)} {m.unit}</td></tr>)}</tbody></table></div></section>
  </>;
}
