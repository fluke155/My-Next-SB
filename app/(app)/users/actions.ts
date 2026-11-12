"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState, Role } from "@/lib/types";

function readRole(formData: FormData): Role {
  return formData.get("role") === "admin" ? "admin" : "user";
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = readRole(formData);

  if (!fullName || !email || !password) return { error: "กรุณากรอกข้อมูลให้ครบ" };
  if (password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // admin สร้างให้ ไม่ต้องยืนยันอีเมล
    user_metadata: { full_name: fullName },
  });
  if (error) {
    const msg = error.message.toLowerCase().includes("already")
      ? "อีเมลนี้มีผู้ใช้อยู่แล้ว"
      : error.message;
    return { error: `สร้างผู้ใช้ไม่สำเร็จ: ${msg}` };
  }

  // trigger สร้าง profile เป็น role user ไว้แล้ว ตั้ง role/ชื่อ ตามที่เลือก
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, full_name: fullName, role });
  if (profileError) return { error: `ตั้งค่า role ไม่สำเร็จ: ${profileError.message}` };

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = readRole(formData);

  if (!fullName) return { error: "กรุณากรอกชื่อ" };
  if (password && password.length < 6) return { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" };
  if (id === me.id && role !== "admin") {
    return { error: "ไม่สามารถลดสิทธิ์ admin ของตัวเองได้" };
  }

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { full_name: fullName },
    ...(password ? { password } : {}),
  });
  if (authError) return { error: `บันทึกไม่สำเร็จ: ${authError.message}` };

  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName, role })
    .eq("id", id);
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/users");
  redirect("/users");
}

export async function deleteUser(id: string) {
  const me = await requireAdmin();
  if (id === me.id) throw new Error("ไม่สามารถลบบัญชีของตัวเองได้");

  const admin = createAdminClient();
  // ลบใน auth.users แล้ว profile จะถูกลบตาม (on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(`ลบไม่สำเร็จ: ${error.message}`);

  revalidatePath("/users");
}
