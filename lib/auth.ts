import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * ผู้ใช้ที่ login อยู่ + profile (null ถ้ายังไม่ได้ login)
 * ห่อด้วย cache() ให้เรียกหลายที่ใน request เดียวแต่ยิง Supabase ครั้งเดียว
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // กรณีสมัครก่อนรัน schema.sql: ยังไม่มีแถว profile ให้ถือเป็น user ธรรมดา
  return (
    (profile as Profile | null) ?? {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string) ?? null,
      role: "user",
      created_at: user.created_at,
    }
  );
});

/** ต้อง login ก่อน ไม่งั้นส่งไปหน้า /login */
export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** ต้องเป็น admin ไม่งั้นส่งกลับหน้าลูกค้า */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "admin") redirect("/customers");
  return profile;
}
