"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

function translateAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("email not confirmed"))
    return "ยังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ยืนยันในอีเมลก่อน";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "อีเมลนี้ถูกใช้สมัครแล้ว";
  if (m.includes("password should be at least"))
    return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
  if (m.includes("rate limit")) return "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  return message;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateAuthError(error.message) };

  redirect("/customers");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!fullName || !email || !password) return { error: "กรุณากรอกข้อมูลให้ครบ" };
  if (password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  if (password !== confirm) return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };

  const origin = (await headers()).get("origin") ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { error: translateAuthError(error.message) };

  // เปิด "Confirm email" ไว้ใน Supabase: ยังไม่มี session ต้องไปยืนยันอีเมลก่อน
  if (!data.session) {
    return {
      success: `สมัครสำเร็จ! เราส่งลิงก์ยืนยันไปที่ ${email} แล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ`,
    };
  }

  redirect("/customers");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
