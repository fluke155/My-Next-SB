import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client ที่ใช้ secret key (ข้าม RLS ได้ทั้งหมด)
 * ใช้เฉพาะฝั่ง server และหลังเช็กว่าเป็น admin แล้วเท่านั้น
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY ใน .env.local (หรือใน Vercel Environment Variables)",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
