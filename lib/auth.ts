import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "ADMIN" | "OPERATOR";
  active: boolean;
};

export async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return { supabase, userId: String(data.claims.sub), claims: data.claims };
}

export async function requireProfile() {
  const { supabase, userId, claims } = await requireSession();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,phone,role,active")
    .eq("id", userId)
    .single();
  if (!profile || !profile.active) redirect("/login?error=account");
  return { supabase, userId, claims, profile: profile as AppProfile };
}

export async function requireAdmin() {
  const context = await requireProfile();
  if (context.profile.role !== "ADMIN") redirect("/dashboard?error=admin");
  return context;
}
