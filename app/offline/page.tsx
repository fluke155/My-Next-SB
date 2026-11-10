import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "ออฟไลน์" };

/** หน้าที่ service worker แสดงเมื่อไม่มีอินเทอร์เน็ต (static ไม่อ่าน cookie) */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-800">
        <WifiOff className="size-8" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h1>
        <p className="mt-1 text-sm text-slate-500">
          ข้อมูลลูกค้าต้องโหลดจากเซิร์ฟเวอร์ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ต้อง reload เต็มหน้าเพื่อเช็กเน็ต */}
      <a
        href="/customers"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        ลองอีกครั้ง
      </a>
    </div>
  );
}
