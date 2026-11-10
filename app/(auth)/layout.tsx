import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";

const features = [
  "เก็บข้อมูลลูกค้าและช่องทางติดต่อไว้ที่เดียว",
  "ประวัติการสั่งซื้อพร้อมรูปสลิป",
  "แยกสิทธิ์ Admin และ User ชัดเจน",
  "ติดตั้งเป็นแอปบนมือถือได้ (PWA)",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-indigo-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-500/40 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/15 font-bold">
            CM
          </div>
          <span className="font-semibold">Customer Manager</span>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-3xl leading-snug font-semibold">
            จัดการลูกค้าและประวัติการสั่งซื้อ
            <br />
            ได้ง่าย ในที่เดียว
          </h2>
          <ul className="space-y-3 text-indigo-100">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="size-5 shrink-0 text-indigo-200" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200">© Customer Manager</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
