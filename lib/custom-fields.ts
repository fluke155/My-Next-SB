import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomField, CustomFieldType } from "@/lib/types";

export const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "ข้อความสั้น" },
  { value: "textarea", label: "ข้อความยาว" },
  { value: "number", label: "ตัวเลข" },
  { value: "date", label: "วันที่" },
  { value: "select", label: "ตัวเลือก (dropdown)" },
  { value: "checkbox", label: "ใช่ / ไม่ใช่ (checkbox)" },
];

export function fieldTypeLabel(type: CustomFieldType) {
  return FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** ชื่อ input ในฟอร์ม (กันชนกับช่องหลักอย่าง full_name) */
export function fieldInputName(field: Pick<CustomField, "key">) {
  return `cf__${field.key}`;
}

/** อ่านรายการฟิลด์ เรียงตามลำดับที่ตั้งไว้ */
export async function getCustomFields(
  supabase: SupabaseClient,
  { includeInactive = false } = {},
): Promise<CustomField[]> {
  let query = supabase
    .from("customer_fields")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  // ยังไม่ได้รัน migration 003: ทำงานต่อได้แบบไม่มีฟิลด์เสริม
  if (error) return [];
  return (data ?? []) as CustomField[];
}

/**
 * อ่านค่าฟิลด์เสริมจากฟอร์ม + ตรวจตามชนิด
 * ช่องที่ว่างจะไม่ถูกเก็บ (ไม่มี key ใน JSON)
 */
export function readCustomFieldValues(
  fields: CustomField[],
  formData: FormData,
): { values: Record<string, unknown>; error?: string } {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const name = fieldInputName(field);

    if (field.type === "checkbox") {
      if (formData.get(name) === "on") values[field.key] = true;
      continue;
    }

    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) {
      if (field.required) return { values, error: `กรุณากรอก "${field.label}"` };
      continue;
    }

    switch (field.type) {
      case "text":
        if (raw.length > 500) return { values, error: `"${field.label}" ยาวเกิน 500 ตัวอักษร` };
        values[field.key] = raw;
        break;
      case "textarea":
        if (raw.length > 5000) return { values, error: `"${field.label}" ยาวเกิน 5,000 ตัวอักษร` };
        values[field.key] = raw;
        break;
      case "number": {
        const n = Number(raw.replace(/,/g, ""));
        if (!Number.isFinite(n)) return { values, error: `"${field.label}" ต้องเป็นตัวเลข` };
        values[field.key] = n;
        break;
      }
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
          return { values, error: `"${field.label}" รูปแบบวันที่ไม่ถูกต้อง` };
        }
        values[field.key] = raw;
        break;
      case "select":
        if (!field.options.includes(raw)) {
          return { values, error: `"${field.label}" ต้องเลือกจากตัวเลือกที่มี` };
        }
        values[field.key] = raw;
        break;
    }
  }

  return { values };
}

/** แปลงค่าที่เก็บไว้เป็นข้อความสำหรับแสดงผล */
export function formatCustomFieldValue(field: CustomField, value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return field.type === "checkbox" ? "ไม่ใช่" : "-";
  }
  switch (field.type) {
    case "checkbox":
      return value === true ? "ใช่" : "ไม่ใช่";
    case "number":
      return Number(value).toLocaleString("th-TH");
    case "date": {
      const [y, m, d] = String(value).split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    }
    default:
      return String(value);
  }
}
