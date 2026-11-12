import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** รับลิงก์ยืนยันอีเมลจาก Supabase แล้วสร้าง session */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/customers`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ")}`,
  );
}
