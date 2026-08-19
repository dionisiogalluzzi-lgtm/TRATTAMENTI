import { createClient } from "@/lib/supabase/server";

function cell(value: unknown) {
  const s = value == null ? "" : String(value);
  return `"${s.replaceAll('"','""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return new Response("Non autorizzato", { status: 401 });
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "conforme" ? "conforme" : "reale";
  let query = supabase.from("v_qdca_records").select("*").order("execution_date", { ascending: true });
  const company = url.searchParams.get("company");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (company) query = query.eq("company_id", company);
  if (from) query = query.gte("execution_date", from);
  if (to) query = query.lte("execution_date", to);
  if (mode === "conforme") query = query.eq("compliance_status", "CONFORME");
  const { data, error } = await query.limit(10000);
  if (error) return new Response(error.message, { status: 400 });

  const headers = [
    "data","ora_inizio","ora_fine","azienda","appezzamento_codice","appezzamento_nome","unita_geospaziale_domanda_aiuto","localizzazione",
    "superficie_trattata_ha","coltura","codice_eppo","bbch","categoria_prodotto","prodotto","numero_autorizzazione",
    "dose_effettiva","base_dose","unita_dose","dose_standard_kg_l_per_ha","unita_standard","quantita_usata","unita_quantita",
    "intervallo_carenza_giorni","operatore","attrezzatura","temperatura_c","umidita_pct","vento_kmh","stato_conformita_etichetta",
    "codici_anomalia","anomalie_etichetta","motivazione_forzatura","data_forzatura","note"
  ];
  const lines = [headers.map(cell).join(";")];
  for (const r of data ?? []) {
    lines.push([
      r.execution_date,r.start_time,r.end_time,r.company_name,r.field_code,r.field_name,r.geospatial_aid_unit,r.location_snapshot,
      r.treated_area_ha,r.crop_name,r.eppo_code,r.bbch_stage,r.product_category,r.product_name,r.authorization_number,
      r.dose_actual,r.dose_basis,r.dose_unit,r.standardized_rate_per_ha,r.standardized_rate_unit,r.quantity_used,r.unit,
      r.preharvest_interval_days,r.operator_name,r.equipment_name,r.weather_temperature_c,r.weather_humidity_pct,r.weather_wind_kmh,
      r.compliance_status,r.compliance_issue_codes,r.compliance_issue_messages,r.compliance_override_reason,r.compliance_override_at,r.notes,
    ].map(cell).join(";"));
  }
  const prefix = mode === "conforme" ? "vista-conforme" : "quaderno-reale";
  const filename = `${prefix}-${new Date().toISOString().slice(0,10)}.csv`;
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
