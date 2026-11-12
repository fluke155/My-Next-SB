"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { FIELD_TYPES } from "@/lib/custom-fields";
import { createClient } from "@/lib/supabase/server";
import type { CustomFieldType, FormState } from "@/lib/types";

function readField(formData: FormData) {
  const options = String(formData.get("options") ?? "")
    .split(/\r?\n/)
    .map((o) => o.trim())
    .filter(Boolean);
  return {
    label: String(formData.get("label") ?? "").trim(),
    type: String(formData.get("type") ?? "") as CustomFieldType,
    required: formData.get("required") === "on",
    options: [...new Set(options)],
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  };
}

function validateField(f: ReturnType<typeof readField>) {
  if (!f.label) return "กรุณากรอกชื่อฟิลด์";
  if (f.label.length > 60) return "ชื่อฟิลด์ยาวเกิน 60 ตัวอักษร";
  if (!FIELD_TYPES.some((t) => t.value === f.type)) return "กรุณาเลือกชนิดข้อมูล";
  if (f.type === "select" && f.options.length === 0) {
    return "ชนิดตัวเลือกต้องมีอย่างน้อย 1 ตัวเลือก (บรรทัดละ 1 ตัวเลือก)";
  }
  return null;
}

function revalidateFields() {
  revalidatePath("/settings/fields");
  revalidatePath("/customers", "layout");
}

export async function createField(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const field = readField(formData);
  const invalid = validateField(field);
  if (invalid) return { error: invalid };

  const supabase = await createClient();

  // key ภายในระบบ สร้างให้อัตโนมัติ (ผู้ใช้เห็นแค่ label)
  const key = `f_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

  const { error } = await supabase.from("customer_fields").insert({
    key,
    ...field,
    options: field.type === "select" ? field.options : [],
  });
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidateFields();
  redirect("/settings/fields");
}

export async function updateField(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("customer_fields")
    .select("type")
    .eq("id", id)
    .single();
  if (!existing) return { error: "ไม่พบฟิลด์นี้" };

  // ไม่ให้เปลี่ยนชนิดหลังสร้าง เพราะค่าที่เก็บไว้แล้วอาจใช้กับชนิดใหม่ไม่ได้
  const field = { ...readField(formData), type: existing.type as CustomFieldType };
  const invalid = validateField(field);
  if (invalid) return { error: invalid };

  const { error } = await supabase
    .from("customer_fields")
    .update({
      label: field.label,
      required: field.required,
      options: field.type === "select" ? field.options : [],
      sort_order: field.sort_order,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidateFields();
  redirect("/settings/fields");
}

export async function deleteField(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  // ลบนิยาม + ลบค่าของฟิลด์นี้ออกจากลูกค้าทุกคน (ฟังก์ชันใน migration 003)
  const { error } = await supabase.rpc("delete_customer_field", { p_id: id });
  if (error) throw new Error(`ลบไม่สำเร็จ: ${error.message}`);

  revalidateFields();
}
