"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

function text(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function nullable(fd: FormData, key: string) {
  const value = text(fd, key);
  return value || null;
}
function num(fd: FormData, key: string) {
  return Number(text(fd, key));
}
function go(kind: "ok" | "error", message: string): never {
  redirect(`/magazzino?${kind}=${encodeURIComponent(message)}`);
}

async function productUnit(supabase: any, productId: string) {
  const { data, error } = await supabase.from("products").select("base_unit").eq("id", productId).single();
  if (error || !data?.base_unit) throw new Error(error?.message ?? "Prodotto non trovato");
  return String(data.base_unit);
}

export async function createInitialStockAction(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const warehouseId = text(fd, "warehouse_id");
  const companyId = text(fd, "company_id");
  const productId = text(fd, "product_id");
  const quantity = num(fd, "quantity");
  if (!Number.isFinite(quantity) || quantity <= 0) go("error", "Quantità non valida");
  let unit: string;
  try { unit = await productUnit(supabase, productId); } catch (e) { go("error", e instanceof Error ? e.message : "Prodotto non valido"); }

  let batchId: string | null = null;
  if (text(fd, "lot_number") || text(fd, "expiry_date")) {
    const { data: batch, error: batchError } = await supabase.from("stock_batches").insert({
      warehouse_id: warehouseId,
      company_id: companyId,
      product_id: productId,
      lot_number: nullable(fd, "lot_number"),
      expiry_date: nullable(fd, "expiry_date"),
      purchase_document: nullable(fd, "document_number"),
      purchase_date: nullable(fd, "purchase_date"),
      unit_cost: text(fd, "unit_cost") ? num(fd, "unit_cost") : null,
    }).select("id").single();
    if (batchError) go("error", batchError.message);
    batchId = batch?.id ?? null;
  }

  const { error } = await supabase.from("stock_movements").insert({
    warehouse_id: warehouseId,
    company_id: companyId,
    product_id: productId,
    batch_id: batchId,
    movement_type: "GIACENZA_INIZIALE",
    quantity,
    unit,
    unit_cost: text(fd, "unit_cost") ? num(fd, "unit_cost") : null,
    document_number: nullable(fd, "document_number"),
    notes: nullable(fd, "notes"),
    created_by: userId,
  });
  if (error) go("error", error.message);
  revalidatePath("/magazzino"); revalidatePath("/dashboard");
  go("ok", `Giacenza registrata in ${unit}`);
}

export async function createTransferAction(fd: FormData) {
  const { supabase, userId } = await requireAdmin();
  const productId = text(fd, "product_id");
  const quantity = num(fd, "quantity");
  if (!Number.isFinite(quantity) || quantity <= 0) go("error", "Quantità non valida");
  let unit: string;
  try { unit = await productUnit(supabase, productId); } catch (e) { go("error", e instanceof Error ? e.message : "Prodotto non valido"); }
  const { data: transfer, error } = await supabase.from("stock_transfers").insert({
    warehouse_id: text(fd, "warehouse_id"),
    from_company_id: text(fd, "from_company_id"),
    to_company_id: text(fd, "to_company_id"),
    product_id: productId,
    quantity,
    unit,
    notes: nullable(fd, "notes"),
    created_by: userId,
  }).select("id").single();
  if (error || !transfer) go("error", error?.message ?? "Trasferimento non creato");
  const { error: rpcError } = await supabase.rpc("confirm_stock_transfer", { p_transfer_id: transfer.id });
  if (rpcError) go("error", rpcError.message);
  revalidatePath("/magazzino"); revalidatePath("/dashboard");
  go("ok", `Trasferimento completato in ${unit}`);
}
