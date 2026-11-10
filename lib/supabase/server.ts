import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

/**
 * Supabase client สำหรับ Server Components, Server Actions และ Route Handlers
 * สร้างใหม่ทุก request (ห้ามเก็บไว้ใช้ซ้ำ)
 */
export async function createClient() {
  const cookieStore = await cookies();
  // Supabase อ่าน Date.now() ตอนเช็กวันหมดอายุของ session
  // io() บอก Next.js ว่าส่วนนี้ต้องทำตอนมี request จริง ไม่ใช่ตอน prerender/prefetch
  await io();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // เรียกจาก Server Component ซึ่งตั้ง cookie ไม่ได้
            // ไม่เป็นไร เพราะ proxy.ts refresh session ให้แล้ว
          }
        },
      },
    },
  );
}
