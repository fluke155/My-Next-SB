import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          สมัครสมาชิก
        </h1>
        <p className="mt-1 text-sm text-slate-500">สร้างบัญชีเพื่อดูข้อมูลลูกค้า</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-slate-500">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
