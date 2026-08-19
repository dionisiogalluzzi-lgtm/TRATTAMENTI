import { createLabelRuleAction, createProductAction } from "@/app/actions";
import { deleteProductAction, updateProductSafetyDataAction } from "@/app/product-actions";
import { Feedback, PageHeader, EmptyState } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MinisterialCatalogSearch } from "@/components/ministerial-catalog-search";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/utils";

function officialLabelHref(registration: string) {
  return `/api/ministry/label?registration=${encodeURIComponent(registration)}`;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const [productsResult, cropsResult, syncResult] = await Promise.all([
    supabase.from("products").select("*,product_labels(id,version_name,valid_from,product_crop_rules(id,adversity,dose_max_per_ha,dose_max_per_hl,dose_unit,max_applications,preharvest_interval_days,crops(name)))").eq("active", true).order("commercial_name"),
    supabase.from("crops").select("id,name").eq("active", true).order("name"),
    profile.role === "ADMIN"
      ? supabase.from("ministry_catalog_sync_runs").select("status,completed_at,source_dataset_date,rows_received,rows_upserted,error_message").order("started_at", { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as any[] }),
  ] as any);
  const products = productsResult.data ?? [];
  const crops = cropsResult.data ?? [];
  const lastSync = syncResult.data?.[0] ?? null;
  const fitoProducts = products.filter((p: any) => p.category === "FITOSANITARIO");

  return <>
    <PageHeader eyebrow="FITOSANITARI" title="Prodotti ed etichette" description="AGRIGAL sincronizza dal Ministero della Salute i dati autorizzativi dei fitosanitari e richiama, tramite il numero di registrazione ministeriale, l'etichetta ufficiale disponibile nella Banca Dati Prodotti Fitosanitari SIAN (MASAF/CREA)." />
    <Feedback ok={params.ok} error={params.error} />

    <section className="panel" style={{ marginBottom: 18 }}>
      <div className="section-head">
        <div><p className="eyebrow">CATALOGO MINISTERO DELLA SALUTE</p><h2>Cerca e aggiungi un fitosanitario</h2></div>
        {lastSync && <div style={{ textAlign: "right" }}>
          <span className={lastSync.status === "SUCCESS" ? "badge success" : lastSync.status === "ERROR" ? "badge danger" : "badge warning"}>{lastSync.status}</span>
          <p className="muted" style={{ margin: "6px 0 0" }}>{lastSync.source_dataset_date ? `Dataset ${fmtDate(lastSync.source_dataset_date)}` : lastSync.completed_at ? fmtDateTime(lastSync.completed_at) : "Sincronizzazione in corso"}</p>
        </div>}
      </div>
      {lastSync?.status === "ERROR" && <div className="alert error">Ultima sincronizzazione non riuscita: {lastSync.error_message}</div>}
      {!lastSync && profile.role === "ADMIN" && <div className="alert info">Il catalogo ministeriale è in fase di prima sincronizzazione.</div>}
      <MinisterialCatalogSearch isAdmin={profile.role === "ADMIN"} />
      <p className="microcopy">Stato autorizzativo e scadenze: Open Data Ministero della Salute. Etichette ufficiali: Banca Dati Prodotti Fitosanitari SIAN (MASAF/CREA). Le schede di sicurezza sono documenti del produttore/fornitore e possono essere collegate al prodotto quando disponibili.</p>
    </section>

    <section className="panel" style={{ marginBottom: 18 }}>
      <div className="section-head"><div><p className="eyebrow">CATALOGO AZIENDALE</p><h2>{products.length} prodotti disponibili in AGRIGAL</h2></div></div>
      {products.length ? <div className="table-wrap"><table><thead><tr><th>Prodotto</th><th>Autorizzazione / stato</th><th>Unità</th><th>Etichette / regole</th><th>Documenti</th>{profile.role === "ADMIN" && <th>Gestione</th>}</tr></thead><tbody>
        {products.map((p: any) => {
          const labels = p.product_labels ?? [];
          const rules = labels.flatMap((l: any) => l.product_crop_rules ?? []);
          const registration = p.ministerial_registration_number || p.authorization_number;
          const labelUrl = p.category === "FITOSANITARIO" && registration ? officialLabelHref(registration) : p.label_url;
          return <tr key={p.id}>
            <td><strong>{p.commercial_name}</strong><span className="muted">{[p.authorization_holder, p.formulation].filter(Boolean).join(" · ")}</span></td>
            <td>{p.authorization_number ? <><strong>Reg. {p.authorization_number}</strong>{p.ministerial_registration_number && <span className={p.active ? "badge success" : "badge danger"} style={{ marginTop: 5 }}>{p.official_status || "MINISTERO"}</span>}{p.official_authorization_expiry_date && <span className="muted">Scadenza {fmtDate(p.official_authorization_expiry_date)}</span>}</> : <span className="muted">Non ministeriale</span>}</td>
            <td>{p.base_unit}</td>
            <td>{rules.length ? rules.slice(0, 3).map((r: any) => <div key={r.id}><strong>{r.crops?.name ?? "Coltura"}</strong> {r.adversity && `· ${r.adversity}`} · carenza {r.preharvest_interval_days ?? "—"} gg{r.max_applications != null ? ` · max ${r.max_applications} appl.` : ""}</div>) : <span className="muted">Regole etichetta da censire/verificare</span>}</td>
            <td>
              <div className="actions-row">
                {labelUrl ? <a className="btn small" href={labelUrl} target="_blank" rel="noreferrer">📄 {p.category === "FITOSANITARIO" && registration ? "Etichetta ufficiale SIAN" : "Etichetta"}</a> : <span className="muted">Etichetta —</span>}
                {p.safety_data_url ? <a className="btn small" href={p.safety_data_url} target="_blank" rel="noreferrer">🧪 Scheda di sicurezza</a> : <span className="muted">SDS —</span>}
              </div>
              {profile.role === "ADMIN" && <details style={{ marginTop: 8 }}><summary className="muted" style={{ cursor: "pointer" }}>{p.safety_data_url ? "Modifica SDS" : "Collega SDS"}</summary><form action={updateProductSafetyDataAction.bind(null, p.id)} className="actions-row" style={{ marginTop: 8 }}><input name="safety_data_url" type="url" defaultValue={p.safety_data_url ?? ""} placeholder="https://...pdf" style={{ minWidth: 220 }} /><button className="btn small">Salva</button></form></details>}
            </td>
            {profile.role === "ADMIN" && <td><form action={deleteProductAction.bind(null, p.id)}><ConfirmSubmitButton className="btn small" message={`Eliminare ${p.commercial_name}? Se il prodotto è già presente nello storico verrà archiviato, non cancellato.`}>Elimina / archivia</ConfirmSubmitButton></form></td>}
          </tr>;
        })}
      </tbody></table></div> : <EmptyState title="Catalogo aziendale vuoto" text="Cerca sopra un fitosanitario nel catalogo del Ministero e aggiungilo con un clic." />}
    </section>

    {profile.role === "ADMIN" && <div className="two-col">
      <section className="panel"><div className="section-head"><div><p className="eyebrow">ALTRI PRODOTTI</p><h2>Fertilizzanti, corroboranti e altro</h2></div></div>
        <p className="muted">La creazione manuale resta disponibile per prodotti che non appartengono alla banca dati ministeriale dei fitosanitari.</p>
        <form action={createProductAction} className="form-grid cols-2">
          <label className="span-2">Nome commerciale<input name="commercial_name" required /></label><label>Produttore<input name="manufacturer" /></label><label>Formulazione<input name="formulation" /></label>
          <label>Unità base<select name="base_unit"><option>L</option><option>KG</option><option>G</option><option>ML</option><option>UNITA</option></select></label>
          <label>Categoria<select name="category"><option>FERTILIZZANTE</option><option>CORROBORANTE</option><option>ALTRO</option></select></label>
          <label className="span-2">Scheda di sicurezza / fonte<input name="safety_data_url" type="url" /></label><button className="btn primary span-2">Salva prodotto non fitosanitario</button>
        </form>
      </section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">ETICHETTA FITOSANITARIA</p><h2>Regola verificata per coltura</h2></div></div>
        {fitoProducts.length ? <form action={createLabelRuleAction} className="form-grid cols-2">
          <label className="span-2">Prodotto<select name="product_id" required>{fitoProducts.map((p: any) => <option key={p.id} value={p.id}>{p.commercial_name} · Reg. {p.authorization_number || "—"}</option>)}</select></label>
          <label>Versione etichetta<input name="version_name" /></label><label>Valida dal<input type="date" name="valid_from" /></label>
          <label>Coltura<select name="crop_id"><option value="">Seleziona</option>{crops.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Avversità<input name="adversity" /></label>
          <label>Dose min / ha<input name="dose_min_per_ha" type="number" step="0.00001" /></label><label>Dose max / ha<input name="dose_max_per_ha" type="number" step="0.00001" /></label>
          <label>Dose min / 100 L<input name="dose_min_per_hl" type="number" step="0.00001" /></label><label>Dose max / 100 L<input name="dose_max_per_hl" type="number" step="0.00001" /></label>
          <label>Unità dose<input name="dose_unit" placeholder="L, KG, ml…" /></label><label>Max applicazioni<input name="max_applications" type="number" /></label>
          <label>Intervallo minimo gg<input name="min_interval_days" type="number" /></label><label>Carenza gg<input name="preharvest_interval_days" type="number" /></label><label>Rientro ore<input name="reentry_interval_hours" type="number" /></label>
          <label className="span-2">URL etichetta/fonte ufficiale<input name="source_url" type="url" /></label><label className="span-2">Restrizioni / note<input name="restrictions" /></label>
          <button className="btn primary span-2">Registra etichetta e regola verificata</button>
        </form> : <div className="alert info">Aggiungi prima almeno un fitosanitario dal catalogo ufficiale.</div>}
      </section>
    </div>}
  </>;
}
