import { getAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const access = await getAccess();
  if (access.status !== "family") return new Response(null, { status: 401, headers });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404, headers });
  try {
    const db = await createClient();
    const { data } = await db.from("profiles").select("avatar_path").eq("id", id).maybeSingle();
    if (!data?.avatar_path) return new Response(null, { status: 404, headers });
    const file = await db.storage.from("family-avatars").download(data.avatar_path);
    if (file.error || !file.data) return new Response(null, { status: 404, headers });
    return new Response(file.data, { headers: { ...headers, "Content-Type": "image/jpeg" } });
  } catch { return new Response(null, { status: 503, headers }); }
}
