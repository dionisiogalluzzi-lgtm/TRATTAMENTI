"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FieldOption = { id: string; code: string; name: string; area_ha: number; companyName: string; cropCycleId: string | null; cropName: string | null };
type ProductOption = { id: string; name: string; unit: string };
type PersonOption = { id: string; name: string };
type EquipmentOption = { id: string; name: string; capacity: number | null };

export function PlanWizard({ fields, products, operators, equipment, userId }: {
  fields: FieldOption[]; products: ProductOption[]; operators: PersonOption[]; equipment: EquipmentOption[]; userId: string;
}) {
  const router = useRouter();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [rowMode, setRowMode] = useState("TUTTE");
  const [water, setWater] = useState(500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const area = useMemo(() => fields.filter(f => selectedFields.includes(f.id)).reduce((s,f) => s + Number(f.area_ha), 0) * (rowMode === "ALTERNATE" ? .5 : 1), [fields, selectedFields, rowMode]);

  function toggle(list: string[], setList: (v:string[])=>void, id: string) {
    setList(list.includes(id) ? list.filter(v => v !== id) : [...list, id]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedFields.length) return setError("Seleziona almeno un appezzamento");
    if (!selectedProducts.length) return setError("Seleziona almeno un prodotto");
    setBusy(true);
    const fd = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: plan, error: planError } = await supabase.from("treatment_plans").insert({
      title: String(fd.get("title")), planned_date: String(fd.get("planned_date")),
      target_or_adversity: String(fd.get("target_or_adversity") || "") || null,
      assigned_operator_id: String(fd.get("assigned_operator_id") || "") || null,
      equipment_id: String(fd.get("equipment_id") || "") || null,
      notes: String(fd.get("notes") || "") || null, created_by: userId,
      status: "PIANIFICATO",
    }).select("id").single();
    if (planError || !plan) { setError(planError?.message ?? "Impossibile creare il piano"); setBusy(false); return; }

    const fieldRows = fields.filter(f => selectedFields.includes(f.id)).map(f => ({
      plan_id: plan.id, field_id: f.id, crop_cycle_id: f.cropCycleId,
      row_mode: rowMode, treated_fraction: rowMode === "ALTERNATE" ? .5 : 1,
      area_ha_snapshot: Number(f.area_ha), water_l_ha: water,
    }));
    const { error: fieldError } = await supabase.from("treatment_plan_fields").insert(fieldRows);
    if (fieldError) { setError(fieldError.message); setBusy(false); return; }

    const productRows = products.filter(p => selectedProducts.includes(p.id)).map(p => ({
      plan_id: plan.id, product_id: p.id,
      dose_amount: Number(fd.get(`dose_${p.id}`) || 0),
      dose_basis: String(fd.get(`basis_${p.id}`) || "PER_HA"),
      dose_unit: String(fd.get(`dose_unit_${p.id}`) || p.unit),
    }));
    if (productRows.some(p => p.dose_amount <= 0)) { setError("Inserisci una dose valida per ogni prodotto selezionato"); setBusy(false); return; }
    const { error: productError } = await supabase.from("treatment_plan_products").insert(productRows);
    if (productError) { setError(productError.message); setBusy(false); return; }

    const { error: requirementError } = await supabase.rpc("refresh_plan_requirements", { p_plan_id: plan.id });
    if (requirementError) { setError(requirementError.message); setBusy(false); return; }
    const { error: complianceError } = await supabase.rpc("refresh_plan_compliance", { p_plan_id: plan.id });
    if (complianceError) { setError(complianceError.message); setBusy(false); return; }
    router.push(`/trattamenti/${plan.id}`); router.refresh();
  }

  return <form onSubmit={submit} className="stack xl-gap">
    <section className="panel"><div className="section-head"><div><p className="eyebrow">1 · PIANO</p><h2>Quando e perché</h2></div></div>
      <div className="form-grid cols-2">
        <label>Titolo<input name="title" placeholder="es. Peronospora vigneti nord" required /></label>
        <label>Data prevista<input name="planned_date" type="date" required /></label>
        <label>Avversità / obiettivo<input name="target_or_adversity" placeholder="Peronospora, oidio, nutrizione…" /></label>
        <label>Operatore<select name="assigned_operator_id"><option value="">Da assegnare</option>{operators.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label>Attrezzatura<select name="equipment_id"><option value="">Da scegliere</option>{equipment.map(e=><option key={e.id} value={e.id}>{e.name}{e.capacity ? ` · ${e.capacity} L` : ""}</option>)}</select></label>
        <label>Note<input name="notes" /></label>
      </div>
    </section>

    <section className="panel"><div className="section-head"><div><p className="eyebrow">2 · SUPERFICI</p><h2>Appezzamenti</h2></div><span className="metric-inline">{area.toFixed(2)} ha trattati</span></div>
      <div className="inline-fields"><label>Distribuzione<select value={rowMode} onChange={e=>setRowMode(e.target.value)}><option value="TUTTE">Tutte le file</option><option value="ALTERNATE">File alternate (50%)</option></select></label><label>Acqua L/ha<input type="number" min="0" step="100" value={water} onChange={e=>setWater(Number(e.target.value))} /></label></div>
      <div className="choice-grid">{fields.map(f=><label className={`choice-card ${selectedFields.includes(f.id)?"selected":""}`} key={f.id}><input type="checkbox" checked={selectedFields.includes(f.id)} onChange={()=>toggle(selectedFields,setSelectedFields,f.id)} /><strong>{f.code} · {f.name}</strong><span>{f.companyName}</span><small>{f.cropName ?? "Coltura non impostata"} · {Number(f.area_ha).toFixed(2)} ha</small></label>)}</div>
    </section>

    <section className="panel"><div className="section-head"><div><p className="eyebrow">3 · RICETTA</p><h2>Prodotti e dosi</h2></div></div>
      <div className="product-picker">{products.map(p=>{const on=selectedProducts.includes(p.id);return <div className={`product-row ${on?"selected":""}`} key={p.id}><label className="product-check"><input type="checkbox" checked={on} onChange={()=>toggle(selectedProducts,setSelectedProducts,p.id)} /><strong>{p.name}</strong></label>{on&&<div className="dose-fields"><input name={`dose_${p.id}`} type="number" min="0.00001" step="0.00001" placeholder="Dose" required /><select name={`basis_${p.id}`}><option value="PER_HA">per ha</option><option value="PER_HL">per 100 L</option></select><input name={`dose_unit_${p.id}`} defaultValue={p.unit} aria-label="Unità dose" /></div>}</div>})}</div>
    </section>
    {error && <div className="alert error">{error}</div>}
    <div className="sticky-actions"><span>Calcolo automatico di fabbisogni/scorte + controlli su coltura, dose, intervallo, numero applicazioni e carenza in base alle etichette censite.</span><button className="btn primary" disabled={busy}>{busy?"Controllo…":"Crea piano e verifica"}</button></div>
  </form>;
}
