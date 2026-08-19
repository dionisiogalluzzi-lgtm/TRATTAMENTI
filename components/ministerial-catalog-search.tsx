"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Result = {
  registration_number: string;
  commercial_name: string;
  authorization_holder: string | null;
  authorization_expiry_date: string | null;
  administrative_status: string | null;
  activity: string | null;
  formulation_description: string | null;
  active_substances: string | null;
  revocation_effective_date: string | null;
  authorization_currently_valid: boolean;
  added_to_farm_catalog: boolean;
  synced_at: string;
};

function dateIt(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT").format(new Date(`${value}T12:00:00`));
}

function isRevoked(row: Result) {
  return Boolean(row.revocation_effective_date) || (row.administrative_status ?? "").toLowerCase().includes("revocat");
}

function ProductCard({
  row,
  isAdmin,
  adding,
  unit,
  onUnitChange,
  onAdd,
}: {
  row: Result;
  isAdmin: boolean;
  adding: string | null;
  unit: string;
  onUnitChange: (value: string) => void;
  onAdd: () => void;
}) {
  const revoked = isRevoked(row);
  const usable = row.authorization_currently_valid && !revoked;

  return <div
    className="card"
    style={{
      borderLeft: usable ? "5px solid #6fa34d" : revoked ? "5px solid #d98b7c" : "5px solid #d5a943",
      opacity: revoked ? 0.82 : 1,
    }}
  >
    <div className="section-head" style={{marginBottom:10}}>
      <div>
        <strong style={{fontSize:18}}>{row.commercial_name}</strong>
        <p style={{margin:"5px 0 0", fontWeight:800}}>REG. MINISTERO {row.registration_number}</p>
        <p className="muted" style={{margin:"3px 0 0"}}>{row.authorization_holder || "Titolare non indicato"}</p>
      </div>
      <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6}}>
        <span className={usable ? "badge success" : revoked ? "badge danger" : "badge warning"}>
          {revoked ? "REVOCATO" : row.administrative_status || "STATO N/D"}
        </span>
        {!revoked && <span className={usable ? "badge success" : "badge warning"}>
          {usable ? "AUTORIZZAZIONE VALIDA" : "VERIFICARE UTILIZZABILITÀ"}
        </span>}
      </div>
    </div>
    <div className="metric-list">
      <div className="metric-box"><span>Scadenza autorizzazione</span><strong>{dateIt(row.authorization_expiry_date)}</strong></div>
      <div className="metric-box"><span>Attività</span><strong style={{fontSize:13}}>{row.activity || "—"}</strong></div>
      <div className="metric-box"><span>Formulazione</span><strong style={{fontSize:13}}>{row.formulation_description || "—"}</strong></div>
    </div>
    {row.active_substances && <p className="muted" style={{margin:"10px 0 0"}}><strong>Sostanze attive:</strong> {row.active_substances}</p>}
    {row.revocation_effective_date && <div className="alert error" style={{marginTop:10,marginBottom:0}}>Revoca con decorrenza {dateIt(row.revocation_effective_date)}</div>}
    {isAdmin && <div className="actions-row" style={{marginTop:12}}>
      {row.added_to_farm_catalog ? <span className="badge success">GIÀ AGGIUNTO</span> : revoked ?
        <span className="badge danger">NON AGGIUNGIBILE · PRODOTTO REVOCATO</span> : !row.authorization_currently_valid ?
        <span className="badge warning">NON AGGIUNGIBILE FINCHÉ NON VERIFICATO</span> : <>
          <select value={unit} onChange={(e) => onUnitChange(e.target.value)} style={{maxWidth:120}} aria-label="Unità base">
            <option value="L">L</option><option value="KG">KG</option><option value="G">G</option><option value="ML">ML</option><option value="UNITA">UNITÀ</option>
          </select>
          <button type="button" className="btn primary" disabled={adding === row.registration_number} onClick={onAdd}>{adding === row.registration_number ? "Aggiungo…" : "Aggiungi ai prodotti aziendali"}</button>
        </>}
    </div>}
  </div>;
}

export function MinisterialCatalogSearch({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const prioritized = useMemo(() => {
    return [...results].sort((a, b) => {
      const revokedOrder = Number(isRevoked(a)) - Number(isRevoked(b));
      if (revokedOrder !== 0) return revokedOrder;
      if (!isRevoked(a) && !isRevoked(b)) {
        const validOrder = Number(b.authorization_currently_valid) - Number(a.authorization_currently_valid);
        if (validOrder !== 0) return validOrder;
      }
      return 0;
    });
  }, [results]);

  const nonRevoked = prioritized.filter((row) => !isRevoked(row));
  const revoked = prioritized.filter((row) => isRevoked(row));

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setBusy(false); return; }
    const timer = setTimeout(async () => {
      setBusy(true); setError("");
      const { data, error } = await supabase.rpc("search_ministerial_catalog", { p_query: q, p_limit: 20 });
      if (error) setError(error.message);
      setResults((data ?? []) as Result[]);
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  async function add(row: Result) {
    if (isRevoked(row) || !row.authorization_currently_valid) return;
    setAdding(row.registration_number); setError("");
    const baseUnit = units[row.registration_number] || "L";
    const { error } = await supabase.rpc("add_product_from_ministry", {
      p_registration_number: row.registration_number,
      p_base_unit: baseUnit,
    });
    if (error) setError(error.message);
    else {
      setResults((current) => current.map((r) => r.registration_number === row.registration_number ? { ...r, added_to_farm_catalog: true } : r));
      router.refresh();
    }
    setAdding(null);
  }

  return <div className="stack">
    <label>Cerca per nome, numero di registrazione o sostanza attiva
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="es. Radar 10 EC, rame, 16032…" autoComplete="off" />
    </label>
    <p className="muted" style={{margin:0}}>I prodotti non revocati sono mostrati per primi; tra questi, quelli con autorizzazione attualmente valida hanno priorità. I prodotti revocati con nome simile sono separati in fondo.</p>
    {busy && <div className="alert info">Ricerca nel catalogo ufficiale…</div>}
    {error && <div className="alert error">{error}</div>}

    {nonRevoked.length > 0 && <div className="stack">
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginTop:8}}>
        <div><p className="eyebrow" style={{marginBottom:4}}>PRIMA SCELTA</p><h3 style={{margin:0}}>Prodotti non revocati</h3></div>
        <span className="badge success">{nonRevoked.length} RISULTATI</span>
      </div>
      <div className="list">
        {nonRevoked.map((row) => <ProductCard
          key={row.registration_number}
          row={row}
          isAdmin={isAdmin}
          adding={adding}
          unit={units[row.registration_number] || "L"}
          onUnitChange={(value) => setUnits((current) => ({...current, [row.registration_number]: value}))}
          onAdd={() => add(row)}
        />)}
      </div>
    </div>}

    {revoked.length > 0 && <div className="stack" style={{marginTop:18}}>
      <div style={{borderTop:"1px solid #dde4dc", paddingTop:18, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12}}>
        <div><p className="eyebrow" style={{marginBottom:4}}>STORICO / NOMI SIMILI</p><h3 style={{margin:0}}>Prodotti revocati</h3></div>
        <span className="badge danger">{revoked.length} REVOCATI</span>
      </div>
      <div className="alert info" style={{marginBottom:0}}>Questi risultati restano visibili per evitare confusione con formulati omonimi o versioni storiche, ma non possono essere aggiunti ai prodotti aziendali.</div>
      <div className="list">
        {revoked.map((row) => <ProductCard
          key={row.registration_number}
          row={row}
          isAdmin={isAdmin}
          adding={adding}
          unit={units[row.registration_number] || "L"}
          onUnitChange={(value) => setUnits((current) => ({...current, [row.registration_number]: value}))}
          onAdd={() => add(row)}
        />)}
      </div>
    </div>}
  </div>;
}
