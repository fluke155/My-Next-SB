import { getCurrentProfile } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { EXTRACT_MODEL, OLLAMA_URL } from "@/lib/ollama";

/**
 * POST /api/ollama/extract-customer
 * รับข้อความที่ลูกค้าพิมพ์มา (เช่นจากแชต) แล้วให้ AI แยกเป็นช่องข้อมูลลูกค้า
 * ตอบกลับ { fields: { full_name, nickname, phone, email, address, birth_date } }
 * ช่องที่ไม่พบในข้อความจะไม่ถูกส่งกลับ
 */

const FIELDS = ["full_name", "nickname", "phone", "email", "address", "birth_date"] as const;
type FieldKey = (typeof FIELDS)[number];

const SCHEMA = {
  type: "object",
  properties: Object.fromEntries(FIELDS.map((k) => [k, { type: "string" }])),
  required: [...FIELDS],
};

const PROMPT = `คุณคือระบบดึงข้อมูลลูกค้าจากข้อความ ตอบเป็น JSON ตามรูปแบบที่กำหนดเท่านั้น
- full_name: ชื่อจริงและนามสกุล ไม่ต้องมีคำนำหน้า (คุณ/นาย/นาง/นางสาว)
- nickname: ชื่อเล่น
- phone: เบอร์โทรศัพท์ ตามที่เขียนในข้อความ
- email: อีเมล
- address: ที่อยู่สำหรับจัดส่ง รวมเป็นบรรทัดเดียว
- birth_date: วันเกิดในรูปแบบ YYYY-MM-DD โดยใช้ตัวเลขปีตามที่เขียนในข้อความ ห้ามแปลงปี (ระบบจะแปลง พ.ศ./ค.ศ. เอง)
ถ้าข้อมูลช่องไหนไม่มีในข้อความ ให้ใส่ "" ห้ามเดาหรือแต่งข้อมูลขึ้นเอง`;

const MAX_TEXT = 4000;

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (profile.role !== "admin") {
    return Response.json({ error: "เฉพาะ Admin เท่านั้น" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "กรุณาวางข้อความก่อน" }, { status: 400 });
  if (text.length > MAX_TEXT) {
    return Response.json({ error: `ข้อความยาวเกิน ${MAX_TEXT.toLocaleString()} ตัวอักษร` }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EXTRACT_MODEL,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: text },
        ],
        format: SCHEMA,
        options: { temperature: 0 },
        stream: false,
      }),
      signal: request.signal,
    });
  } catch {
    return Response.json(
      { error: "เชื่อมต่อ Ollama ไม่ได้ ตรวจว่าเปิดแอป Ollama อยู่หรือไม่" },
      { status: 503 },
    );
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const notFound = res.status === 404;
    return Response.json(
      {
        error: notFound
          ? `ไม่พบโมเดล ${EXTRACT_MODEL} ในเครื่อง ให้รัน ollama pull ${EXTRACT_MODEL}`
          : `Ollama ตอบกลับผิดพลาด: ${detail?.error ?? res.status}`,
      },
      { status: 502 },
    );
  }

  let raw: Record<string, unknown>;
  try {
    const data = (await res.json()) as { message?: { content?: string } };
    raw = JSON.parse(data.message?.content ?? "{}");
  } catch {
    return Response.json({ error: "AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองใหม่อีกครั้ง" }, { status: 502 });
  }

  return Response.json({ fields: cleanFields(raw, text) });
}

/**
 * ตรวจค่าที่ AI ส่งมาอีกชั้น กันข้อมูลที่ AI แต่งขึ้นเอง
 * - เบอร์โทรและอีเมลต้องมีอยู่ในข้อความต้นฉบับจริง
 * - วันเกิดต้องเป็นวันที่ที่ถูกต้องและไม่อยู่ในอนาคต
 */
function cleanFields(raw: Record<string, unknown>, source: string) {
  const out: Partial<Record<FieldKey, string>> = {};
  const sourceDigits = source.replace(/\D/g, "");
  const sourceLower = source.toLowerCase();

  for (const key of FIELDS) {
    const value = typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, 500) : "";
    if (!value) continue;

    if (key === "phone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 9 || !sourceDigits.includes(digits)) continue;
    }
    if (key === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || !sourceLower.includes(value.toLowerCase())) {
        continue;
      }
    }
    if (key === "birth_date") {
      const date = normalizeDate(value);
      if (!date) continue;
      out.birth_date = date;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * รับ YYYY-MM-DD ที่ปีเป็นได้ทั้ง พ.ศ. และ ค.ศ. แล้วแปลงเป็น ค.ศ. คืน null ถ้าใช้ไม่ได้
 * (ให้โค้ดแปลงปีเอง เพราะโมเดลเล็กลบ 543 ผิดบ่อย)
 */
function normalizeDate(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  let year = Number(m[1]);
  if (year > 2400) year -= 543;
  const iso = `${year}-${m[2]}-${m[3]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  if (year < 1900 || iso > todayISO()) return null;
  return iso;
}
