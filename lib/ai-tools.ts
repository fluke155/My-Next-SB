import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * เครื่องมือที่ให้ AI เรียกใช้ตอนแชต (tool calling) เพื่อตอบคำถามจากข้อมูลจริงในระบบ
 * - อ่านข้อมูลอย่างเดียว ไม่มีเครื่องมือเพิ่ม แก้ หรือลบ
 * - ใช้ Supabase client ของผู้ใช้ที่ login อยู่ จึงเห็นเฉพาะข้อมูลที่ RLS อนุญาต
 */

/** นิยามเครื่องมือในรูปแบบที่ Ollama ต้องการ (ส่งไปใน "tools") */
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "search_customers",
      description:
        "ค้นหาลูกค้าจากชื่อ ชื่อเล่น เบอร์โทร หรืออีเมล คืนรายชื่อพร้อมเบอร์ จำนวนออเดอร์ ยอดซื้อรวม และวันที่ซื้อล่าสุด ถ้าไม่ใส่คำค้นจะคืนลูกค้าล่าสุด",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "คำค้น เช่น ชื่อ ชื่อเล่น หรือเบอร์โทร" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer",
      description:
        "ดูข้อมูลลูกค้า 1 คนแบบละเอียด พร้อมประวัติการสั่งซื้อ ใช้ชื่อหรือ id ของลูกค้าก็ได้",
      parameters: {
        type: "object",
        properties: {
          customer: { type: "string", description: "id ของลูกค้า หรือชื่อ/ชื่อเล่นของลูกค้า" },
        },
        required: ["customer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "order_summary",
      description:
        "สรุปออเดอร์ในช่วงวันที่: จำนวนออเดอร์ ยอดขายรวม ยอดเฉลี่ย และลูกค้าที่ซื้อมากที่สุด ถ้าไม่ระบุวันที่จะสรุปทั้งหมด",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "วันเริ่มต้น YYYY-MM-DD (ค.ศ.)" },
          end_date: { type: "string", description: "วันสิ้นสุด YYYY-MM-DD (ค.ศ.)" },
          top: { type: "number", description: "จำนวนลูกค้าอันดับต้นที่ต้องการ (ค่าเริ่มต้น 5)" },
          sort_by: {
            type: "string",
            enum: ["total", "count"],
            description: "จัดอันดับลูกค้าตาม total = ยอดเงินรวม (ซื้อเยอะ) หรือ count = จำนวนครั้ง (ซื้อบ่อย) ค่าเริ่มต้น total",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "birthdays_in_month",
      description: "รายชื่อลูกค้าที่เกิดในเดือนที่ระบุ",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "เดือน 1-12" },
        },
        required: ["month"],
      },
    },
  },
] as const;

export const TOOL_LABELS: Record<string, string> = {
  search_customers: "ค้นหาลูกค้า",
  get_customer: "ดูข้อมูลลูกค้า",
  order_summary: "สรุปออเดอร์",
  birthdays_in_month: "ค้นหาวันเกิด",
};

type Args = Record<string, unknown>;

type CustomerWithOrders = {
  id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  birth_date: string | null;
  orders: { order_date: string; total_amount: number | string; note?: string | null }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** กันอักขระพิเศษที่ทำให้ filter ของ PostgREST พัง (แบบเดียวกับหน้าลูกค้า) */
function sanitize(q: string) {
  return q.replace(/[,()*%\\]/g, " ").trim().slice(0, 100);
}

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function summarize(c: CustomerWithOrders) {
  const total = c.orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const last = c.orders.reduce<string | null>(
    (max, o) => (max === null || o.order_date > max ? o.order_date : max),
    null,
  );
  return {
    id: c.id,
    full_name: c.full_name,
    nickname: c.nickname,
    phone: c.phone,
    email: c.email,
    birth_date: c.birth_date,
    order_count: c.orders.length,
    total_spent: money(total),
    last_order_date: last ?? "ยังไม่เคยสั่งซื้อ",
  };
}

const CUSTOMER_COLUMNS = "id, full_name, nickname, phone, email, birth_date, orders(order_date, total_amount)";

async function searchCustomers(supabase: SupabaseClient, args: Args) {
  const q = sanitize(str(args.query));
  let query = supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(10);
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,nickname.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }
  const { data, error } = await query;
  if (error) return { error: error.message };
  const rows = (data ?? []) as CustomerWithOrders[];
  return { count: rows.length, customers: rows.map(summarize) };
}

async function getCustomer(supabase: SupabaseClient, args: Args) {
  const key = str(args.customer);
  if (!key) return { error: "ต้องระบุชื่อหรือ id ของลูกค้า" };

  let id = key;
  if (!UUID_RE.test(key)) {
    // ส่งชื่อมา: หาให้ก่อน ถ้าเจอหลายคนให้ AI ถามผู้ใช้ต่อ
    const found = await searchCustomers(supabase, { query: key });
    if ("error" in found) return found;
    if (found.count === 0) return { error: `ไม่พบลูกค้าที่ชื่อ "${key}"` };
    if (found.count > 1) {
      return {
        note: "พบลูกค้าหลายคน ให้ถามผู้ใช้ว่าหมายถึงคนไหน",
        candidates: found.customers.map((c) => ({ id: c.id, full_name: c.full_name, nickname: c.nickname })),
      };
    }
    id = found.customers[0].id;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, nickname, phone, email, address, birth_date, orders(order_date, total_amount, note)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "ไม่พบลูกค้า" };

  const c = data as CustomerWithOrders;
  const orders = [...c.orders].sort((a, b) => b.order_date.localeCompare(a.order_date));
  return {
    ...summarize(c),
    address: c.address ?? null,
    recent_orders: orders.slice(0, 20).map((o) => ({
      order_date: o.order_date,
      total_amount: Number(o.total_amount),
      note: o.note ?? null,
    })),
  };
}

async function orderSummary(supabase: SupabaseClient, args: Args) {
  const start = str(args.start_date);
  const end = str(args.end_date);
  if ((start && !DATE_RE.test(start)) || (end && !DATE_RE.test(end))) {
    return { error: "วันที่ต้องเป็นรูปแบบ YYYY-MM-DD" };
  }
  const top = Math.min(Math.max(Math.floor(Number(args.top) || 5), 1), 20);
  const sortBy = args.sort_by === "count" ? "count" : "total";

  let query = supabase
    .from("orders")
    .select("order_date, total_amount, customer_id, customers(full_name, nickname)")
    .limit(10000);
  if (start) query = query.gte("order_date", start);
  if (end) query = query.lte("order_date", end);
  const { data, error } = await query;
  if (error) return { error: error.message };

  type Row = {
    total_amount: number | string;
    customer_id: string;
    customers: { full_name: string; nickname: string | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const total = rows.reduce((s, r) => s + Number(r.total_amount), 0);

  const byCustomer = new Map<string, { full_name: string; nickname: string | null; order_count: number; total: number }>();
  for (const r of rows) {
    const cur = byCustomer.get(r.customer_id) ?? {
      full_name: r.customers?.full_name ?? "-",
      nickname: r.customers?.nickname ?? null,
      order_count: 0,
      total: 0,
    };
    cur.order_count += 1;
    cur.total += Number(r.total_amount);
    byCustomer.set(r.customer_id, cur);
  }

  return {
    period: { start_date: start || "ทั้งหมด", end_date: end || "ทั้งหมด" },
    order_count: rows.length,
    customer_count: byCustomer.size,
    total_amount: money(total),
    average_per_order: rows.length ? money(total / rows.length) : 0,
    top_customers_sorted_by: sortBy === "count" ? "จำนวนครั้งที่ซื้อ" : "ยอดเงินรวม",
    top_customers: [...byCustomer.values()]
      .sort((a, b) =>
        sortBy === "count" ? b.order_count - a.order_count || b.total - a.total : b.total - a.total,
      )
      .slice(0, top)
      .map((c) => ({ ...c, total: money(c.total) })),
  };
}

async function birthdaysInMonth(supabase: SupabaseClient, args: Args) {
  const month = Math.floor(Number(args.month));
  if (!(month >= 1 && month <= 12)) return { error: "เดือนต้องเป็นตัวเลข 1-12" };

  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, nickname, phone, birth_date")
    .not("birth_date", "is", null)
    .limit(5000);
  if (error) return { error: error.message };

  const rows = (data ?? []) as { id: string; full_name: string; nickname: string | null; phone: string | null; birth_date: string }[];
  const matches = rows
    .filter((c) => Number(c.birth_date.slice(5, 7)) === month)
    .sort((a, b) => a.birth_date.slice(8).localeCompare(b.birth_date.slice(8)));
  return { month, count: matches.length, customers: matches };
}

const HANDLERS: Record<string, (s: SupabaseClient, a: Args) => Promise<unknown>> = {
  search_customers: searchCustomers,
  get_customer: getCustomer,
  order_summary: orderSummary,
  birthdays_in_month: birthdaysInMonth,
};

/** เรียกเครื่องมือตามชื่อ คืนผลเป็น JSON string สำหรับส่งกลับไปให้ AI */
export async function runTool(supabase: SupabaseClient, name: string, rawArgs: unknown): Promise<string> {
  const handler = HANDLERS[name];
  if (!handler) return JSON.stringify({ error: `ไม่มีเครื่องมือชื่อ ${name}` });
  const args = rawArgs && typeof rawArgs === "object" ? (rawArgs as Args) : {};
  try {
    return JSON.stringify(await handler(supabase, args));
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message });
  }
}
