"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

const SLIP_BUCKET = "slips";
const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const SLIP_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function revalidateCustomers() {
  revalidatePath("/customers");
  revalidatePath("/customers/[id]", "page");
}

// ---------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------

function readCustomer(formData: FormData) {
  return {
    full_name: text(formData, "full_name") ?? "",
    nickname: text(formData, "nickname"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    address: text(formData, "address"),
  };
}

function validateCustomer(c: ReturnType<typeof readCustomer>) {
  if (!c.full_name) return "กรุณากรอกชื่อจริง";
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) return "รูปแบบอีเมลไม่ถูกต้อง";
  if (c.phone && !/^[0-9+\-\s()]{6,20}$/.test(c.phone)) return "รูปแบบเบอร์โทรไม่ถูกต้อง";
  return null;
}

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const customer = readCustomer(formData);
  const invalid = validateCustomer(customer);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").insert(customer).select("id").single();
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidateCustomers();
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const customer = readCustomer(formData);
  const invalid = validateCustomer(customer);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(customer).eq("id", id);
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidateCustomers();
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  // ลบรูปสลิปทั้งหมดของลูกค้าคนนี้ก่อน (orders จะถูกลบตามด้วย on delete cascade)
  const { data: orders } = await supabase
    .from("orders")
    .select("slip_path")
    .eq("customer_id", id);
  const paths = (orders ?? []).map((o) => o.slip_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(SLIP_BUCKET).remove(paths);

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(`ลบไม่สำเร็จ: ${error.message}`);

  revalidateCustomers();
  redirect("/customers");
}

// ---------------------------------------------------------------------
// Orders (ประวัติการสั่งซื้อ + สลิป)
// ---------------------------------------------------------------------

function readOrder(formData: FormData) {
  const amount = Number(String(formData.get("total_amount") ?? "").replace(/,/g, ""));
  return {
    order_date: text(formData, "order_date"),
    total_amount: amount,
    note: text(formData, "note"),
  };
}

function validateOrder(o: ReturnType<typeof readOrder>) {
  if (!o.order_date) return "กรุณาเลือกวันที่สั่งซื้อ";
  if (!Number.isFinite(o.total_amount) || o.total_amount < 0) return "ยอดเงินไม่ถูกต้อง";
  return null;
}

/** คืนค่าไฟล์สลิปจากฟอร์ม (null ถ้าไม่ได้เลือกไฟล์) หรือ error message */
function readSlip(formData: FormData): { file: File | null; error?: string } {
  const file = formData.get("slip");
  if (!(file instanceof File) || file.size === 0) return { file: null };
  if (!SLIP_TYPES[file.type]) return { file: null, error: "สลิปต้องเป็นไฟล์ JPG, PNG หรือ WEBP" };
  if (file.size > MAX_SLIP_BYTES) return { file: null, error: "ไฟล์สลิปต้องไม่เกิน 5 MB" };
  return { file };
}

async function uploadSlip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  orderId: string,
  file: File,
) {
  // ใส่ timestamp ในชื่อไฟล์ ตอนเปลี่ยนสลิปจะได้ไม่ติด cache รูปเก่า
  const path = `${customerId}/${orderId}-${Date.now()}.${SLIP_TYPES[file.type]}`;
  const { error } = await supabase.storage
    .from(SLIP_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  return { path, error };
}

export async function createOrder(
  customerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const order = readOrder(formData);
  const invalid = validateOrder(order);
  if (invalid) return { error: invalid };
  const slip = readSlip(formData);
  if (slip.error) return { error: slip.error };

  const supabase = await createClient();
  const orderId = crypto.randomUUID();

  let slipPath: string | null = null;
  if (slip.file) {
    const upload = await uploadSlip(supabase, customerId, orderId, slip.file);
    if (upload.error) return { error: `อัปโหลดสลิปไม่สำเร็จ: ${upload.error.message}` };
    slipPath = upload.path;
  }

  const { error } = await supabase
    .from("orders")
    .insert({ id: orderId, customer_id: customerId, ...order, slip_path: slipPath });
  if (error) {
    if (slipPath) await supabase.storage.from(SLIP_BUCKET).remove([slipPath]);
    return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
  }

  revalidateCustomers();
  redirect(`/customers/${customerId}`);
}

export async function updateOrder(
  customerId: string,
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const order = readOrder(formData);
  const invalid = validateOrder(order);
  if (invalid) return { error: invalid };
  const slip = readSlip(formData);
  if (slip.error) return { error: slip.error };
  const removeSlip = formData.get("remove_slip") === "on";

  const supabase = await createClient();
  const { data: existing, error: findError } = await supabase
    .from("orders")
    .select("slip_path")
    .eq("id", orderId)
    .single();
  if (findError) return { error: "ไม่พบรายการสั่งซื้อนี้" };

  let slipPath: string | null = existing.slip_path;
  if (slip.file) {
    const upload = await uploadSlip(supabase, customerId, orderId, slip.file);
    if (upload.error) return { error: `อัปโหลดสลิปไม่สำเร็จ: ${upload.error.message}` };
    slipPath = upload.path;
  } else if (removeSlip) {
    slipPath = null;
  }

  const { error } = await supabase
    .from("orders")
    .update({ ...order, slip_path: slipPath })
    .eq("id", orderId);
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  // ลบไฟล์เก่าเมื่อเปลี่ยนหรือเอาสลิปออก
  if (existing.slip_path && existing.slip_path !== slipPath) {
    await supabase.storage.from(SLIP_BUCKET).remove([existing.slip_path]);
  }

  revalidateCustomers();
  redirect(`/customers/${customerId}`);
}

export async function deleteOrder(customerId: string, orderId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("orders")
    .select("slip_path")
    .eq("id", orderId)
    .single();

  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw new Error(`ลบไม่สำเร็จ: ${error.message}`);

  if (existing?.slip_path) {
    await supabase.storage.from(SLIP_BUCKET).remove([existing.slip_path]);
  }

  revalidateCustomers();
}
