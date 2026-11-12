"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, Database, RotateCcw, SendHorizontal, Square, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** tools = เครื่องมือที่ AI ใช้ตอบข้อความนี้ (แสดงผลอย่างเดียว ไม่ส่งกลับไปที่ server) */
type Message = { role: "user" | "assistant"; content: string; tools?: string[] };
type ModelInfo = { name: string; parameterSize: string | null; tools: boolean };

const EXAMPLES = [
  "ลูกค้าคนไหนซื้อเยอะที่สุด",
  "เดือนนี้มีออเดอร์กี่รายการ ยอดรวมเท่าไร",
  "ลูกค้าคนไหนเกิดเดือนนี้บ้าง",
];

const MODEL_KEY = "chat:model";

export function ChatClient() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState("");
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // โหลดรายชื่อโมเดลจาก /api/ollama/models ตอนเปิดหน้า
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ollama/models")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "โหลดรายชื่อโมเดลไม่สำเร็จ");
        const list: ModelInfo[] = data.models;
        setModels(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(MODEL_KEY);
        } catch {}
        // ใช้โมเดลที่เลือกไว้ครั้งก่อน ไม่งั้นเลือกตัวที่ถามข้อมูลในระบบได้ก่อน
        setModel(
          list.find((m) => m.name === saved)?.name ??
            list.find((m) => m.tools)?.name ??
            list[0]?.name ??
            "",
        );
        if (list.length === 0) setModelsError("ยังไม่มีโมเดลในเครื่อง ให้รัน ollama pull <ชื่อโมเดล> ก่อน");
      })
      .catch((e: Error) => !cancelled && setModelsError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function chooseModel(name: string) {
    setModel(name);
    try {
      localStorage.setItem(MODEL_KEY, name);
    } catch {}
  }

  async function send(e?: FormEvent, preset?: string) {
    e?.preventDefault();
    const text = (preset ?? input).trim();
    if (!text || !model || streaming) return;

    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `เกิดข้อผิดพลาด (${res.status})`);
      }

      // แก้ข้อความล่าสุดของ AI (กล่องที่กำลังทยอยตอบ)
      const updateLast = (fn: (m: Message) => Message) =>
        setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);

      // อ่านคำตอบที่ทยอยส่งมา (NDJSON: 1 บรรทัด = 1 event)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { t: "text" | "tool" | "error"; v: string };
          if (ev.t === "text") updateLast((m) => ({ ...m, content: m.content + ev.v }));
          else if (ev.t === "tool") updateLast((m) => ({ ...m, tools: [...(m.tools ?? []), ev.v] }));
          else streamError = ev.v;
        }
      }
      if (streamError) throw new Error(streamError);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
      // ถ้า AI ยังไม่ได้ตอบอะไรเลย เอากล่องข้อความว่างออก
      setMessages((prev) =>
        prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev,
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่ (ไม่ส่งระหว่างพิมพ์ภาษาที่ใช้ IME)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }

  const current = models.find((m) => m.name === model);

  return (
    <Card className="flex h-[calc(100dvh-17rem)] min-h-96 flex-col lg:h-[calc(100dvh-13rem)]">
      {/* แถบเลือกโมเดล */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          โมเดล
          <select
            value={model}
            onChange={(e) => chooseModel(e.target.value)}
            disabled={streaming || models.length === 0}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            {models.length === 0 && <option value="">-</option>}
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
                {m.parameterSize ? ` (${m.parameterSize})` : ""}
                {m.tools ? " · ถามข้อมูลได้" : ""}
              </option>
            ))}
          </select>
        </label>
        {current && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              current.tools
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <Database className="size-3.5" />
            {current.tools ? "ตอบจากข้อมูลลูกค้าและออเดอร์" : "คุยทั่วไป (โมเดลนี้ดึงข้อมูลในระบบไม่ได้)"}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={reset} disabled={messages.length === 0}>
          <RotateCcw className="size-4" />
          เริ่มแชตใหม่
        </Button>
      </div>

      {/* ข้อความ */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {modelsError && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {modelsError}
          </p>
        )}
        {messages.length === 0 && !modelsError && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
            <Bot className="size-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm">
              {current?.tools
                ? "ถามเรื่องลูกค้า ออเดอร์ หรือยอดขายได้เลย เช่น"
                : "พิมพ์ข้อความด้านล่างเพื่อเริ่มคุย"}
            </p>
            {current?.tools && (
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(undefined, q)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            pending={streaming && i === messages.length - 1 && m.role === "assistant"}
          />
        ))}
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ช่องพิมพ์ */}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm field-sizing-content focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        {streaming ? (
          <Button type="button" variant="secondary" onClick={() => abortRef.current?.abort()}>
            <Square className="size-4" />
            หยุด
          </Button>
        ) : (
          <Button type="submit" disabled={!input.trim() || !model}>
            <SendHorizontal className="size-4" />
            ส่ง
          </Button>
        )}
      </form>
    </Card>
  );
}

function MessageBubble({ message, pending }: { message: Message; pending: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div className={`flex max-w-[80%] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {message.tools && message.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(message.tools)].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <Database className="size-3" />
                {t}
              </span>
            ))}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          {message.content ||
            (pending && (
              <span className="animate-pulse text-slate-400">
                {message.tools?.length
                  ? `กำลัง${message.tools[message.tools.length - 1]}...`
                  : "กำลังคิด..."}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
