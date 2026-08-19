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

export function MinisterialCatalogSearch({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

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
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="es. Switch, rame, 12345…" autoComplete="off" />
    </label>
    <p className="muted" style={{margin:0}}>Catalogo ufficiale del Ministero della Salute. Digita almeno 2 caratteri.</p>
    {busy && <div className="alert info">Ricerca nel catalogo ufficiale…</div>}
    {error && <div className="alert error">{error}</div>}
    {results.length > 0 && <div className="list">
      {results.map((r) => <div className="card" key={r.registration_number}>
        <div className="section-head" style={{marginBottom:10}}>
          <div>
            <strong>{r.commercial_name}</strong>
            <p className="muted" style={{margin:"4px 0 0"}}>Reg. {r.registration_number} · {r.authorization_holder || "Titolare non indicato"}</p>
          </div>
          <span className={r.authorization_currently_valid ? "badge success" : "badge danger"}>{r.administrative_status || "STATO N/D"}</span>
        </div>
        <div className="metric-list">
          <div className="metric-box"><span>Scadenza</span><strong>{dateIt(r.authorization_expiry_date)}</strong></div>
          <div className="metric-box"><span>Attività</span><strong style={{fontSize:13}}>{r.activity || "—"}</strong></div>
          <div className="metric-box"><span>Formulazione</span><strong style={{fontSize:13}}>{r.formulation_description || "—"}</strong></div>
        </div>
        {r.active_substances && <p className="muted" style={{margin:"10px 0 0"}}><strong>Sostanze attive:</strong> {r.active_substances}</p>}
        {r.revocation_effective_date && <div className="alert error" style={{marginTop:10,marginBottom:0}}>Revoca con decorrenza {dateIt(r.revocation_effective_date)}</div>}
        {isAdmin && <div className="actions-row" style={{marginTop:12}}>
          {r.added_to_farm_catalog ? <span className="badge success">GIÀ AGGIUNTO</span> : <>
            <select value={units[r.registration_number] || "L"} onChange={(e) => setUnits((u) => ({...u,[r.registration_number]:e.target.value}))} style={{maxWidth:120}} aria-label="Unità base">
              <option value="L">L</option><option value="KG">KG</option><option value="G">G</option><option value="ML">ML</option><option value="UNITA">UNITÀ</option>
            </select>
            <button type="button" className="btn primary" disabled={adding === r.registration_number} onClick={() => add(r)}>{adding === r.registration_number ? "Aggiungo…" : "Aggiungi ai prodotti aziendali"}</button>
          </>}
        </div>}
      </div>)}
    </div>}
  </div>;
}
