"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";

function text(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function nullable(fd: FormData, key: string) {
  const value = text(fd, key);
  return value || null;
}
function num(fd: FormData, key: string, fallback = 0) {
  const n = Number(text(fd, key));
  return Number.isFinite(n) ? n : fallback;
}
function go(path: string, kind: "ok" | "error", message: string): never {
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}${kind}=${encodeURIComponent(message)}`);
}

export async function signOutAction() {
  const { supabase } = await requireProfile();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function claimInitialAdminAction(fd: FormData) {
  const { supabase } = await requireProfile();
  const code = text(fd, "code");
  if (!code) go("/setup", "error", "Inserisci il codice di attivazione");
  const { error } = await supabase.rpc("claim_initial_admin", { p_code: code });
  if (error) go("/setup", "error", error.message);
  revalidatePath("/", "layout");
  go("/dashboard", "ok", "Profilo ADMIN attivato");
}

export async function updateProfileAction(fd: FormData) {
  const { supabase, userId } = await requireProfile();
  const { error } = await supabase.from("profiles").update({
    full_name: nullable(fd, "full_name"),
    phone: nullable(fd, "phone"),
  }).eq("id", userId);
  if (error) go("/impostazioni", "error", error.message);
  revalidatePath("/", "layout");
  go("/impostazioni", "ok", "Profilo aggiornato");
}

export async function createCompanyAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = text(fd, "name");
  if (!name) go("/aziende", "error", "Ragione sociale obbligatoria");
  const { error } = await supabase.from("companies").insert({
    name,
    short_name: nullable(fd, "short_name"),
    vat_number: nullable(fd, "vat_number"),
    tax_code: nullable(fd, "tax_code"),
    cuaa: nullable(fd, "cuaa"),
    address: nullable(fd, "address"),
    city: nullable(fd, "city"),
    province: nullable(fd, "province"),
    region: nullable(fd, "region"),
    notes: nullable(fd, "notes"),
  });
  if (error) go("/aziende", "error", error.message);
  revalidatePath("/aziende"); revalidatePath("/dashboard");
  go("/aziende", "ok", "Azienda creata");
}

export async function createFieldAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const companyId = text(fd, "company_id");
  const cropId = text(fd, "crop_id");
  const { data: field, error } = await supabase.from("fields").insert({
    company_id: companyId,
    code: text(fd, "code"),
    name: text(fd, "name"),
    area_ha: num(fd, "area_ha"),
    municipality: nullable(fd, "municipality"),
    province: nullable(fd, "province"),
    cadastral_refs: nullable(fd, "cadastral_refs"),
    notes: nullable(fd, "notes"),
  }).select("id").single();
  if (error || !field) go("/appezzamenti", "error", error?.message ?? "Errore appezzamento");
  if (cropId) {
    const { error: cycleError } = await supabase.from("crop_cycles").insert({
      field_id: field.id,
      crop_id: cropId,
      variety: nullable(fd, "variety"),
      start_date: text(fd, "start_date") || new Date().toISOString().slice(0, 10),
      cultivation_method: text(fd, "cultivation_method") || "CONVENZIONALE",
      current_bbch: nullable(fd, "current_bbch"),
    });
    if (cycleError) go("/appezzamenti", "error", `Appezzamento creato, ciclo colturale non creato: ${cycleError.message}`);
  }
  revalidatePath("/appezzamenti"); revalidatePath("/dashboard");
  go("/appezzamenti", "ok", "Appezzamento creato");
}

export async function createProductAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("products").insert({
    commercial_name: text(fd, "commercial_name"),
    authorization_number: nullable(fd, "authorization_number"),
    authorization_holder: nullable(fd, "authorization_holder"),
    manufacturer: nullable(fd, "manufacturer"),
    formulation: nullable(fd, "formulation"),
    base_unit: text(fd, "base_unit") || "L",
    category: text(fd, "category") || "FITOSANITARIO",
    label_url: nullable(fd, "label_url"),
    safety_data_url: nullable(fd, "safety_data_url"),
    notes: nullable(fd, "notes"),
  });
  if (error) go("/prodotti", "error", error.message);
  revalidatePath("/prodotti");
  go("/prodotti", "ok", "Prodotto creato");
}

export async function createLabelRuleAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const productId = text(fd, "product_id");
  const { data: label, error } = await supabase.from("product_labels").insert({
    product_id: productId,
    version_name: nullable(fd, "version_name") || `Etichetta ${new Date().toISOString().slice(0,10)}`,
    valid_from: nullable(fd, "valid_from"),
    source_url: nullable(fd, "source_url"),
    notes: nullable(fd, "label_notes"),
  }).select("id").single();
  if (error || !label) go("/prodotti", "error", error?.message ?? "Etichetta non creata");
  const cropId = text(fd, "crop_id");
  if (cropId) {
    const numberOrNull = (key: string) => text(fd, key) ? num(fd, key) : null;
    const { error: ruleError } = await supabase.from("product_crop_rules").insert({
      product_label_id: label.id,
      crop_id: cropId,
      adversity: nullable(fd, "adversity"),
      dose_min_per_ha: numberOrNull("dose_min_per_ha"),
      dose_max_per_ha: numberOrNull("dose_max_per_ha"),
      dose_min_per_hl: numberOrNull("dose_min_per_hl"),
      dose_max_per_hl: numberOrNull("dose_max_per_hl"),
      dose_unit: nullable(fd, "dose_unit"),
      max_applications: numberOrNull("max_applications"),
      min_interval_days: numberOrNull("min_interval_days"),
      preharvest_interval_days: numberOrNull("preharvest_interval_days"),
      reentry_interval_hours: numberOrNull("reentry_interval_hours"),
      restrictions: nullable(fd, "restrictions"),
    });
    if (ruleError) go("/prodotti", "error", `Etichetta creata, regola non creata: ${ruleError.message}`);
  }
  revalidatePath("/prodotti");
  go("/prodotti", "ok", "Etichetta/regola registrata");
}

export async function createEquipmentAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("equipment").insert({
    company_id: nullable(fd, "company_id"),
    name: text(fd, "name"),
    equipment_type: text(fd, "equipment_type"),
    brand: nullable(fd, "brand"),
    model: nullable(fd, "model"),
    capacity_l: text(fd, "capacity_l") ? num(fd, "capacity_l") : null,
    plate_or_serial: nullable(fd, "plate_or_serial"),
    inspection_expiry: nullable(fd, "inspection_expiry"),
    hourly_cost: text(fd, "hourly_cost") ? num(fd, "hourly_cost") : null,
  });
  if (error) go("/impostazioni", "error", error.message);
  revalidatePath("/impostazioni");
  go("/impostazioni", "ok", "Attrezzatura aggiunta");
}

export async function createInitialStockAction(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const warehouseId = text(fd, "warehouse_id");
  const companyId = text(fd, "company_id");
  const productId = text(fd, "product_id");
  const quantity = num(fd, "quantity");
  if (quantity <= 0) go("/magazzino", "error", "Quantità non valida");
  let batchId: string | null = null;
  if (text(fd, "lot_number") || text(fd, "expiry_date")) {
    const { data: batch, error: batchError } = await supabase.from("stock_batches").insert({
      warehouse_id: warehouseId, company_id: companyId, product_id: productId,
      lot_number: nullable(fd, "lot_number"), expiry_date: nullable(fd, "expiry_date"),
      purchase_document: nullable(fd, "document_number"), purchase_date: nullable(fd, "purchase_date"),
      unit_cost: text(fd, "unit_cost") ? num(fd, "unit_cost") : null,
    }).select("id").single();
    if (batchError) go("/magazzino", "error", batchError.message);
    batchId = batch?.id ?? null;
  }
  const { error } = await supabase.from("stock_movements").insert({
    warehouse_id: warehouseId, company_id: companyId, product_id: productId, batch_id: batchId,
    movement_type: "GIACENZA_INIZIALE", quantity, unit: text(fd, "unit"),
    unit_cost: text(fd, "unit_cost") ? num(fd, "unit_cost") : null,
    document_number: nullable(fd, "document_number"), notes: nullable(fd, "notes"), created_by: userId,
  });
  if (error) go("/magazzino", "error", error.message);
  revalidatePath("/magazzino"); revalidatePath("/dashboard");
  go("/magazzino", "ok", "Giacenza registrata");
}

export async function createTransferAction(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const { data: transfer, error } = await supabase.from("stock_transfers").insert({
    warehouse_id: text(fd, "warehouse_id"), from_company_id: text(fd, "from_company_id"),
    to_company_id: text(fd, "to_company_id"), product_id: text(fd, "product_id"),
    quantity: num(fd, "quantity"), unit: text(fd, "unit"), notes: nullable(fd, "notes"), created_by: userId,
  }).select("id").single();
  if (error || !transfer) go("/magazzino", "error", error?.message ?? "Trasferimento non creato");
  const { error: rpcError } = await supabase.rpc("confirm_stock_transfer", { p_transfer_id: transfer.id });
  if (rpcError) go("/magazzino", "error", rpcError.message);
  revalidatePath("/magazzino");
  go("/magazzino", "ok", "Trasferimento completato");
}

export async function createActivityAction(fd: FormData) {
  const { supabase, userId, profile } = await requireProfile();
  const companyId = text(fd, "company_id");
  const fieldId = nullable(fd, "field_id");
  const { error } = await supabase.from("activities").insert({
    company_id: companyId, field_id: fieldId, activity_type: text(fd, "activity_type"),
    activity_date: text(fd, "activity_date") || new Date().toISOString().slice(0, 10),
    operator_id: userId, quantity: text(fd, "quantity") ? num(fd, "quantity") : null,
    unit: nullable(fd, "unit"), direct_cost: text(fd, "direct_cost") ? num(fd, "direct_cost") : null,
    notes: nullable(fd, "notes"), created_by: userId,
  });
  if (error) go("/attivita", "error", error.message);
  revalidatePath("/attivita"); revalidatePath("/dashboard");
  go("/attivita", "ok", `Attività registrata da ${profile.full_name ?? "utente"}`);
}

export async function refreshPlanAction(planId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("refresh_plan_requirements", { p_plan_id: planId });
  if (error) go(`/trattamenti/${planId}`, "error", error.message);
  revalidatePath(`/trattamenti/${planId}`); revalidatePath("/trattamenti");
  go(`/trattamenti/${planId}`, "ok", "Fabbisogni ricalcolati");
}

export async function createPurchasesFromPlanAction(planId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("create_purchase_orders_from_plan", { p_plan_id: planId });
  if (error) go(`/trattamenti/${planId}`, "error", error.message);
  revalidatePath("/acquisti"); revalidatePath(`/trattamenti/${planId}`);
  go(`/trattamenti/${planId}`, "ok", `${data ?? 0} ordine/i proposto/i creato/i`);
}

export async function startExecutionAction(planId: string) {
  const { supabase } = await requireProfile();
  const { data, error } = await supabase.rpc("start_plan_execution", { p_plan_id: planId });
  if (error || !data) go(`/trattamenti/${planId}`, "error", error?.message ?? "Esecuzione non creata");
  revalidatePath("/trattamenti"); revalidatePath("/esecuzioni");
  redirect(`/esecuzioni/${data}`);
}

export async function saveExecutionAction(executionId: string, fd: FormData) {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("treatment_executions").update({
    execution_date: text(fd, "execution_date"),
    weather_temperature_c: text(fd, "weather_temperature_c") ? num(fd, "weather_temperature_c") : null,
    weather_humidity_pct: text(fd, "weather_humidity_pct") ? num(fd, "weather_humidity_pct") : null,
    weather_wind_kmh: text(fd, "weather_wind_kmh") ? num(fd, "weather_wind_kmh") : null,
    weather_notes: nullable(fd, "weather_notes"), notes: nullable(fd, "notes"),
  }).eq("id", executionId);
  if (error) go(`/esecuzioni/${executionId}`, "error", error.message);

  const { data: products } = await supabase.from("treatment_execution_products").select("id").eq("execution_id", executionId);
  for (const row of products ?? []) {
    const value = text(fd, `qty_${row.id}`);
    if (value) await supabase.from("treatment_execution_products").update({ quantity_used: Number(value) }).eq("id", row.id);
  }
  const { data: fields } = await supabase.from("treatment_execution_fields").select("id").eq("execution_id", executionId);
  for (const row of fields ?? []) {
    await supabase.from("treatment_execution_fields").update({
      start_time: nullable(fd, `start_${row.id}`), end_time: nullable(fd, `end_${row.id}`),
      bbch_stage: nullable(fd, `bbch_${row.id}`),
    }).eq("id", row.id);
  }
  revalidatePath(`/esecuzioni/${executionId}`);
  go(`/esecuzioni/${executionId}`, "ok", "Dati esecuzione salvati");
}

export async function completeExecutionAction(executionId: string) {
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc("complete_treatment_execution", { p_execution_id: executionId });
  if (error) go(`/esecuzioni/${executionId}`, "error", error.message);
  revalidatePath("/", "layout");
  go(`/esecuzioni/${executionId}`, "ok", "Trattamento completato e magazzino scaricato");
}

export async function receivePurchaseAction(orderId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("receive_purchase_order", { p_order_id: orderId });
  if (error) go("/acquisti", "error", error.message);
  revalidatePath("/acquisti"); revalidatePath("/magazzino");
  go("/acquisti", "ok", "Ordine ricevuto e caricato a magazzino");
}

export async function createTaskAction(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("tasks").insert({
    company_id: nullable(fd, "company_id"), title: text(fd, "title"), description: nullable(fd, "description"),
    due_at: nullable(fd, "due_at"), assigned_to: nullable(fd, "assigned_to"), created_by: userId,
  });
  if (error) go("/impostazioni", "error", error.message);
  revalidatePath("/dashboard"); revalidatePath("/impostazioni");
  go("/impostazioni", "ok", "Attività operatore assegnata");
}

export async function setUserRoleAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: text(fd, "user_id"), p_role: text(fd, "role"),
  });
  if (error) go("/impostazioni", "error", error.message);
  revalidatePath("/impostazioni");
  go("/impostazioni", "ok", "Ruolo aggiornato");
}

export async function setCompanyAccessAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const userId = text(fd, "user_id");
  const companyId = text(fd, "company_id");
  const grant = text(fd, "operation") === "grant";
  const query = grant
    ? supabase.from("company_users").upsert({ user_id: userId, company_id: companyId })
    : supabase.from("company_users").delete().eq("user_id", userId).eq("company_id", companyId);
  const { error } = await query;
  if (error) go("/impostazioni", "error", error.message);
  revalidatePath("/impostazioni");
  go("/impostazioni", "ok", grant ? "Accesso azienda concesso" : "Accesso azienda rimosso");
}
