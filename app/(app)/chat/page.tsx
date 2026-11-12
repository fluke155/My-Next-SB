import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { ChatClient } from "./chat-client";

export const metadata: Metadata = { title: "แชต AI" };

export default function ChatPage() {
  return (
    <>
      <PageHeader
        title="แชต AI"
        description="ถามข้อมูลลูกค้าและออเดอร์ด้วย AI ที่รันบนเครื่องผ่าน Ollama (ดูข้อมูลได้อย่างเดียว)"
      />
      <ChatClient />
    </>
  );
}
