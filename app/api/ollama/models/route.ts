import { getCurrentProfile } from "@/lib/auth";
import { listModels, supportsTools } from "@/lib/ollama";

/** GET /api/ollama/models: รายชื่อโมเดลใน Ollama สำหรับ dropdown */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  try {
    const models = await listModels();
    // embedding model ใช้แชตไม่ได้ ไม่ต้องแสดง
    const chatModels = models.filter((m) => !/embed/i.test(m.name));
    const tools = await Promise.all(chatModels.map((m) => supportsTools(m.name)));
    return Response.json({
      models: chatModels.map((m, i) => ({
        name: m.name,
        size: m.size,
        parameterSize: m.details?.parameter_size ?? null,
        tools: tools[i],
      })),
    });
  } catch {
    return Response.json(
      { error: "เชื่อมต่อ Ollama ไม่ได้ ตรวจว่าเปิดแอป Ollama อยู่หรือไม่" },
      { status: 503 },
    );
  }
}
