import { TOOL_DEFINITIONS, TOOL_LABELS, runTool } from "@/lib/ai-tools";
import { getCurrentProfile } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { OLLAMA_URL, SYSTEM_PROMPT, dataSystemPrompt, parseChatBody, supportsTools } from "@/lib/ollama";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/ollama/chat
 * รับ { model, messages } จากหน้าเว็บ แล้วคุยกับ Ollama แบบ stream
 *
 * ถ้าโมเดลเรียกเครื่องมือได้ (tool calling) AI จะดึงข้อมูลลูกค้า/ออเดอร์จาก Supabase เอง
 * ด้วยสิทธิ์ของผู้ใช้ที่ login อยู่ (อ่านอย่างเดียว) แล้ววนถาม AI ต่อจนได้คำตอบ
 *
 * ส่งกลับเป็น NDJSON ทีละบรรทัด:
 *   {"t":"text","v":"..."}   ข้อความคำตอบที่ทยอยมา
 *   {"t":"tool","v":"..."}   AI กำลังใช้เครื่องมือ (ชื่อภาษาไทย)
 *   {"t":"error","v":"..."}  เกิดข้อผิดพลาดระหว่างทาง
 */

const MAX_ROUNDS = 6;

type ToolCall = { function: { name: string; arguments: unknown } };
type OllamaMessage = {
  role: string;
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
};

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = parseChatBody(await request.json().catch(() => null));
  if (!body) return Response.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });

  let useTools: boolean;
  try {
    useTools = await supportsTools(body.model);
  } catch {
    return Response.json(
      { error: "เชื่อมต่อ Ollama ไม่ได้ ตรวจว่าเปิดแอป Ollama อยู่หรือไม่" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const convo: OllamaMessage[] = [
    { role: "system", content: useTools ? dataSystemPrompt(todayISO()) : SYSTEM_PROMPT },
    ...body.messages,
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (t: "text" | "tool" | "error", v: string) =>
        controller.enqueue(encoder.encode(JSON.stringify({ t, v }) + "\n"));

      try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const { content, toolCalls } = await chatOnce(body.model, convo, useTools, request.signal, (text) =>
            send("text", text),
          );
          if (toolCalls.length === 0) return; // ได้คำตอบสุดท้ายแล้ว

          // AI ขอใช้เครื่องมือ: เรียกให้ แล้วส่งผลกลับไปให้ AI ตอบต่อ
          convo.push({ role: "assistant", content, tool_calls: toolCalls });
          for (const call of toolCalls) {
            const name = call.function.name;
            send("tool", TOOL_LABELS[name] ?? name);
            const result = await runTool(supabase, name, call.function.arguments);
            convo.push({ role: "tool", tool_name: name, content: result });
          }
        }
        send("error", "AI ใช้เครื่องมือหลายรอบเกินไป ลองถามให้เจาะจงขึ้น");
      } catch (e) {
        if ((e as Error).name !== "AbortError") send("error", (e as Error).message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** ถาม AI 1 รอบแบบ stream: ส่งข้อความออกไปทันทีที่ได้ และเก็บ tool_calls ไว้ */
async function chatOnce(
  model: string,
  messages: OllamaMessage[],
  useTools: boolean,
  signal: AbortSignal,
  onText: (text: string) => void,
) {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        ...(useTools ? { tools: TOOL_DEFINITIONS, options: { temperature: 0.2 } } : {}),
        stream: true,
      }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("เชื่อมต่อ Ollama ไม่ได้ ตรวจว่าเปิดแอป Ollama อยู่หรือไม่");
  }
  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    throw new Error(`Ollama ตอบกลับผิดพลาด: ${detail?.error ?? res.status}`);
  }

  let content = "";
  const toolCalls: ToolCall[] = [];
  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const part = JSON.parse(line) as { message?: OllamaMessage; error?: string };
    if (part.error) throw new Error(part.error);
    const text = part.message?.content;
    if (text) {
      content += text;
      onText(text);
    }
    if (part.message?.tool_calls) toolCalls.push(...part.message.tool_calls);
  };

  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  }
  handleLine(buffer);

  return { content, toolCalls };
}
