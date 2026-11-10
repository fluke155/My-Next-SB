export type Role = "admin" | "user";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  created_at: string;
};

export type Customer = {
  id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  order_date: string;
  total_amount: number;
  note: string | null;
  slip_path: string | null;
  created_at: string;
};

/** state ที่ Server Action ส่งกลับให้ฟอร์ม (useActionState) */
export type FormState = {
  error?: string;
  success?: string;
} | null;
