import "server-only";

/**
 * ที่อยู่ของ Ollama server (ค่าเริ่มต้นคือเครื่องเดียวกัน)
 * เปลี่ยนได้ด้วย OLLAMA_URL ใน .env.local เช่น http://192.168.1.10:11434
 */
export const OLLAMA_URL = (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "");

/**
 * โมเดลสำหรับดึงข้อมูลลูกค้าจากข้อความ (ต้องเก่งภาษาไทยและตอบ JSON ได้ดี)
 * เปลี่ยนได้ด้วย OLLAMA_EXTRACT_MODEL ใน .env.local
 */
export const EXTRACT_MODEL = process.env.OLLAMA_EXTRACT_MODEL ?? "qwen2.5:7b";

export const SYSTEM_PROMPT =
  "คุณคือผู้ช่วย AI ที่ตอบเป็นภาษาไทยอย่างกระชับ สุภาพ และถูกต้อง ถ้าไม่แน่ใจให้บอกตรงๆ";

/** system prompt สำหรับโหมดถามข้อมูลในระบบ (โมเดลที่เรียกเครื่องมือได้) */
export function dataSystemPrompt(today: string) {
  return `คุณคือผู้ช่วยของระบบจัดการลูกค้า Customer Manager วันนี้คือ ${today} (เวลาไทย)
- คุณไม่รู้ข้อมูลลูกค้าหรือออเดอร์ใดๆ เลยจนกว่าจะเรียกเครื่องมือ ทุกคำถามเรื่องลูกค้า ออเดอร์ ยอดขาย หรือวันเกิด ต้องเรียกเครื่องมือก่อนตอบเสมอ ห้ามเดาหรือแต่งชื่อ ตัวเลข หรือข้อมูลใดๆ ขึ้นเอง
- เลือกเครื่องมือ:
  - ลูกค้าที่ซื้อมากที่สุด อันดับลูกค้า ยอดขาย จำนวนออเดอร์ ในช่วงเวลาใดๆ หรือทั้งหมด -> order_summary (ซื้อบ่อย = sort_by "count", ซื้อเยอะ = sort_by "total")
  - หาลูกค้าจากชื่อ ชื่อเล่น หรือเบอร์ -> search_customers
  - รายละเอียดหรือประวัติการซื้อของลูกค้าคนใดคนหนึ่ง -> get_customer
  - ลูกค้าที่เกิดในเดือนใดเดือนหนึ่ง -> birthdays_in_month
- ถ้าเครื่องมือไม่พบข้อมูล ให้บอกตรงๆ ว่าไม่พบ
- วันที่ที่ส่งให้เครื่องมือต้องเป็นปี ค.ศ. รูปแบบ YYYY-MM-DD
- ตอบเป็นภาษาไทยอย่างกระชับ แสดงจำนวนเงินเป็นบาท ใช้ "ครับ" อย่างเดียว ตอบเฉพาะข้อมูลที่ได้จากเครื่องมือเท่านั้น
- คุณดูข้อมูลได้อย่างเดียว เพิ่ม แก้ไข หรือลบข้อมูลไม่ได้ ถ้าผู้ใช้ขอให้แก้ข้อมูล ให้แนะนำให้ทำผ่านหน้าเว็บ
- คำถามทั่วไปที่ไม่เกี่ยวกับข้อมูลในระบบ ตอบได้ตามปกติโดยไม่ต้องเรียกเครื่องมือ`;
}

/** โมเดลนี้เรียกเครื่องมือ (tool calling) ได้ไหม ดูจาก capabilities ของ /api/show */
export async function supportsTools(model: string): Promise<boolean> {
  const res = await fetch(`${OLLAMA_URL}/api/show`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { capabilities?: string[] };
  return data.capabilities?.includes("tools") ?? false;
}

export type OllamaModel = {
  name: string;
  size: number;
  details?: { parameter_size?: string; family?: string };
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** รายชื่อโมเดลที่ติดตั้งใน Ollama (GET /api/tags) */
export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_URL}/api/tags`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Ollama ตอบกลับ ${res.status}`);
  const data = (await res.json()) as { models?: OllamaModel[] };
  return data.models ?? [];
}

const MAX_MESSAGES = 50;
const MAX_CHARS = 8000;

/** ตรวจข้อมูลที่ส่งมาจากหน้าเว็บ คืน null ถ้าไม่ถูกต้อง */
export function parseChatBody(body: unknown): { model: string; messages: ChatMessage[] } | null {
  if (!body || typeof body !== "object") return null;
  const { model, messages } = body as { model?: unknown; messages?: unknown };
  if (typeof model !== "string" || !model.trim() || model.length > 200) return null;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null;
  }

  const clean: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.length > MAX_CHARS) return null;
    clean.push({ role, content });
  }
  if (clean[clean.length - 1].role !== "user") return null;
  return { model: model.trim(), messages: clean };
}
