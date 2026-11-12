import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CallbackError, LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          เข้าสู่ระบบ
        </h1>
        <p className="mt-1 text-sm text-slate-500">ยินดีต้อนรับกลับ กรอกอีเมลและรหัสผ่านของคุณ</p>
      </div>
      <Suspense fallback={null}>
        <CallbackError />
      </Suspense>
      <LoginForm />
      <p className="text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
