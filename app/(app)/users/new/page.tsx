import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createUser } from "../actions";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "เพิ่มผู้ใช้" };

export default function NewUserPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="เพิ่มผู้ใช้"
        description="สร้างบัญชีใหม่ ใช้งานได้ทันทีโดยไม่ต้องยืนยันอีเมล"
        back={<BackLink href="/users">กลับไปหน้าผู้ใช้งาน</BackLink>}
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AdminOnlyForm />
      </Suspense>
    </div>
  );
}

async function AdminOnlyForm() {
  await requireAdmin();
  return <UserForm action={createUser} />;
}
