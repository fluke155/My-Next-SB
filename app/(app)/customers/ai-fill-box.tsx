"use client";

import { useState, type RefObject } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const LABELS: Record<string, string> = {
  full_name: "ชื่อ-นามสกุล",
  nickname: "ชื่อเล่น",
  phone: "เบอร์โทร",
  email: "อีเมล",
  address: "ที่อยู่",
  birth_date: "วันเกิด",
};

const HIGHLIGHT = ["ring-2", "ring-emerald-400", "bg-emerald-50", "dark:bg-emerald-500/10"];

/**
 * กล่อง "วางข้อความแล้วให้ AI กรอกฟอร์มให้"
 * ส่งข้อความไปที่ /api/ollama/extract-customer แล้วเอาผลไปใส่ในช่องของฟอร์ม
 * ผู้ใช้ต้องตรวจและกดบันทึกเอง (AI ไม่บันทึกข้อมูลให้)
 */
export function AiFillBox({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState<string[] | null>(null);

  async function fill() {
    const form = formRef.current;
    if (!form || !text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setFilled(null);

    try {
      const res = await fetch("/api/ollama/extract-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `เกิดข้อผิดพลาด (${res.status})`);

      const fields = (data?.fields ?? {}) as Record<string, string>;
      const done: string[] = [];
      for (const [name, value] of Object.entries(fields)) {
        const el = form.elements.namedItem(name);
        if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue;
        el.value = value;
        el.classList.add(...HIGHLIGHT);
        setTimeout(() => el.classList.remove(...HIGHLIGHT), 4000);
        done.push(LABELS[name] ?? name);
      }
      setFilled(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="group rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300">
        <Sparkles className="size-4" />
        วางข้อความแล้วให้ AI กรอกให้
        <span className="ml-auto text-xs font-normal text-indigo-500 group-open:hidden">คลิกเพื่อเปิด</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          วางข้อความที่ลูกค้าส่งมา เช่นจาก LINE หรือ Facebook แล้ว AI จะแยกชื่อ เบอร์ อีเมล ที่อยู่
          และวันเกิดใส่ในฟอร์มให้ ตรวจข้อมูลก่อนกดบันทึกทุกครั้ง
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="เช่น ชื่อ สมหญิง ใจดี ชื่อเล่น หญิง โทร 089-123-4567 ส่งที่ 12/3 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={fill} disabled={!text.trim() || loading}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "กำลังอ่านข้อความ..." : "กรอกให้อัตโนมัติ"}
          </Button>
          {filled && filled.length > 0 && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              กรอกให้แล้ว: {filled.join(", ")} (ตรวจก่อนบันทึก)
            </p>
          )}
          {filled && filled.length === 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400">ไม่พบข้อมูลลูกค้าในข้อความนี้</p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </details>
  );
}
