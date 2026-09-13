import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessAdmin, isFamilyProfile, type FamilyProfile } from "./profile";

type Access = { status: "family"; profile: FamilyProfile } |
  { status: "anonymous" | "missing-profile" | "unavailable" };

// React cache deduplicates within one render only; never share-cache identity.
export const getAccess = cache(async (): Promise<Access> => {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { status: "anonymous" };
    const { data, error: profileError } = await supabase.from("profiles")
      .select("id, display_name, role, member_slot").eq("id", user.id).maybeSingle();
    if (profileError) return { status: "unavailable" };
    if (!isFamilyProfile(data, user.id)) return { status: "missing-profile" };
    return { status: "family", profile: data };
  } catch {
    return { status: "unavailable" };
  }
});

export async function requireProfile() {
  const access = await getAccess();
  if (access.status !== "family") redirect("/login");
  return access.profile;
}

export async function requireAdmin() {
  const profile = await requireProfile();
  if (!canAccessAdmin(profile)) redirect("/khac");
  return profile;
}

