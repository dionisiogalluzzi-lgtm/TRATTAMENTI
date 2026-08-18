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
  let query = supabase.from("v_qdca_records").select("*").order("execution_date", { ascending: true });
  const company = url.searchParams.get("company");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (company) query = query.eq("company_id", company);
  if (from) query = query.gte("execution_date", from);
  if (to) query = query.lte("execution_date", to);
  const { data, error } = await query.limit(10000);
  if (error) return new Response(error.message, { status: 400 });

  const headers = ["data","ora_inizio","ora_fine","azienda","appezzamento_codice","appezzamento_nome","localizzazione","superficie_trattata_ha","coltura","codice_eppo","bbch","prodotto","numero_autorizzazione","dose","base_dose","unita_dose","quantita_usata","unita","intervallo_carenza_giorni","operatore","attrezzatura","temperatura_c","umidita_pct","vento_kmh","note"];
  const lines = [headers.map(cell).join(";")];
  for (const r of data ?? []) {
    lines.push([
      r.execution_date,r.start_time,r.end_time,r.company_name,r.field_code,r.field_name,r.location_snapshot,r.treated_area_ha,r.crop_name,r.eppo_code,r.bbch_stage,r.product_name,r.authorization_number,r.dose_actual,r.dose_basis,r.dose_unit,r.quantity_used,r.unit,r.preharvest_interval_days,r.operator_name,r.equipment_name,r.weather_temperature_c,r.weather_humidity_pct,r.weather_wind_kmh,r.notes,
    ].map(cell).join(";"));
  }
  const filename = `quaderno-campagna-${new Date().toISOString().slice(0,10)}.csv`;
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
