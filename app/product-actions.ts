"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

function text(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function go(kind: "ok" | "error", message: string): never {
  redirect(`/prodotti?${kind}=${encodeURIComponent(message)}`);
}

export async function deleteProductAction(productId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("delete_unused_product", { p_product_id: productId });
  if (error) go("error", error.message);
  revalidatePath("/prodotti");
  revalidatePath("/trattamenti/nuovo");
  go("ok", data === "ARCHIVED" ? "Prodotto già usato: archiviato e rimosso dalle nuove pianificazioni" : "Prodotto eliminato");
}

export async function updateProductSafetyDataAction(productId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const raw = text(fd, "safety_data_url");
  let value: string | null = null;
  if (raw) {
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      value = url.toString();
    } catch {
      go("error", "Inserisci un URL http/https valido per la scheda di sicurezza");
    }
  }
  const { error } = await supabase.from("products").update({ safety_data_url: value }).eq("id", productId);
  if (error) go("error", error.message);
  revalidatePath("/prodotti");
  go("ok", value ? "Scheda di sicurezza collegata" : "Scheda di sicurezza rimossa");
}
