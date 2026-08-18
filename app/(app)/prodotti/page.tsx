import { createLabelRuleAction, createProductAction } from "@/app/actions";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const [{ data: productsData }, { data: crops }] = await Promise.all([
    supabase.from("products").select("*,product_labels(id,version_name,valid_from,product_crop_rules(id,adversity,dose_max_per_ha,dose_max_per_hl,dose_unit,max_applications,preharvest_interval_days,crops(name)))").order("commercial_name"),
    supabase.from("crops").select("id,name").eq("active",true).order("name"),
  ]);
  const products = productsData ?? [];
  return <>
    <PageHeader eyebrow="FITOSANITARI" title="Prodotti ed etichette" description="Anagrafica commerciale, numero di autorizzazione e versioni storiche delle regole d'impiego. Lo storico dei trattamenti conserva snapshot dei dati usati." />
    <Feedback ok={params.ok} error={params.error} />
    <section className="panel" style={{marginBottom:18}}><div className="section-head"><div><p className="eyebrow">CATALOGO</p><h2>{products.length} prodotti</h2></div></div>
      {products.length ? <div className="table-wrap"><table><thead><tr><th>Prodotto</th><th>Autorizzazione</th><th>Unità</th><th>Etichette / regole</th></tr></thead><tbody>{products.map((p:any)=>{const labels=p.product_labels??[];const rules=labels.flatMap((l:any)=>l.product_crop_rules??[]);return <tr key={p.id}><td><strong>{p.commercial_name}</strong><span className="muted">{[p.manufacturer,p.formulation].filter(Boolean).join(" · ")}</span></td><td>{p.authorization_number||"—"}</td><td>{p.base_unit}</td><td>{rules.length ? rules.slice(0,3).map((r:any)=><div key={r.id}><strong>{r.crops?.name ?? "Coltura"}</strong> {r.adversity && `· ${r.adversity}`} · carenza {r.preharvest_interval_days ?? "—"} gg</div>) : <span className="muted">Regole da censire</span>}</td></tr>})}</tbody></table></div> : <EmptyState title="Catalogo vuoto" text="Inserisci i prodotti utilizzati in azienda e associa le regole delle etichette ufficiali." />}
    </section>
    {profile.role === "ADMIN" && <div className="two-col">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">NUOVO PRODOTTO</p><h2>Anagrafica commerciale</h2></div></div><form action={createProductAction} className="form-grid cols-2">
        <label className="span-2">Nome commerciale<input name="commercial_name" required /></label><label>N. autorizzazione<input name="authorization_number" /></label><label>Titolare autorizzazione<input name="authorization_holder" /></label><label>Produttore<input name="manufacturer" /></label><label>Formulazione<input name="formulation" /></label><label>Unità base<select name="base_unit"><option>L</option><option>KG</option><option>G</option><option>ML</option><option>UNITA</option></select></label><label>Categoria<select name="category"><option>FITOSANITARIO</option><option>FERTILIZZANTE</option><option>CORROBORANTE</option><option>ALTRO</option></select></label><label className="span-2">URL etichetta ufficiale<input name="label_url" type="url" /></label><label className="span-2">URL scheda sicurezza<input name="safety_data_url" type="url" /></label><button className="btn primary span-2">Salva prodotto</button>
      </form></section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">ETICHETTA</p><h2>Regola per coltura</h2></div></div>{products.length ? <form action={createLabelRuleAction} className="form-grid cols-2">
        <label className="span-2">Prodotto<select name="product_id" required>{products.map((p:any)=><option key={p.id} value={p.id}>{p.commercial_name}</option>)}</select></label><label>Versione etichetta<input name="version_name" /></label><label>Valida dal<input type="date" name="valid_from" /></label><label>Coltura<select name="crop_id"><option value="">Seleziona</option>{crops?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Avversità<input name="adversity" /></label><label>Dose min / ha<input name="dose_min_per_ha" type="number" step="0.00001" /></label><label>Dose max / ha<input name="dose_max_per_ha" type="number" step="0.00001" /></label><label>Dose min / 100 L<input name="dose_min_per_hl" type="number" step="0.00001" /></label><label>Dose max / 100 L<input name="dose_max_per_hl" type="number" step="0.00001" /></label><label>Unità dose<input name="dose_unit" placeholder="L, KG, ml…" /></label><label>Max applicazioni<input name="max_applications" type="number" /></label><label>Intervallo minimo gg<input name="min_interval_days" type="number" /></label><label>Carenza gg<input name="preharvest_interval_days" type="number" /></label><label>Rientro ore<input name="reentry_interval_hours" type="number" /></label><label className="span-2">URL fonte<input name="source_url" type="url" /></label><label className="span-2">Restrizioni / note<input name="restrictions" /></label><button className="btn primary span-2">Registra etichetta e regola</button>
      </form>:<div className="alert info">Crea prima almeno un prodotto.</div>}</section>
    </div>}
  </>;
}
