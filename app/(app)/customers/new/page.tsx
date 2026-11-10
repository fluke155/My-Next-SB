import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "เพิ่มลูกค้า" };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="เพิ่มลูกค้า"
        description="กรอกข้อมูลลูกค้าใหม่"
        back={<BackLink href="/customers">กลับไปหน้าลูกค้า</BackLink>}
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AdminOnlyForm />
      </Suspense>
    </div>
  );
}

async function AdminOnlyForm() {
  await requireAdmin();
  return <CustomerForm action={createCustomer} cancelHref="/customers" />;
}
