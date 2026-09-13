export type FamilyProfile = {
  id: string;
  display_name: string;
  role: "member" | "admin";
  member_slot: number;
};

// Validate the returned row as well as its relationship to the verified Auth user.
export function isFamilyProfile(value: unknown, userId: string): value is FamilyProfile {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.id === userId && typeof row.display_name === "string" &&
    row.display_name.trim().length > 0 &&
    (row.role === "member" || row.role === "admin") &&
    typeof row.member_slot === "number" && Number.isInteger(row.member_slot) &&
    row.member_slot >= 1 && row.member_slot <= 5;
}

export function canAccessAdmin(profile: FamilyProfile) {
  return profile.role === "admin";
}

