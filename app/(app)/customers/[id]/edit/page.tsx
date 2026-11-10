import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";
import { updateCustomer } from "../../actions";
import { CustomerForm } from "../../customer-form";

export const metadata: Metadata = { title: "แก้ไขลูกค้า" };

export default function EditCustomerPage({ params }: PageProps<"/customers/[id]/edit">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditCustomer params={params} />
      </Suspense>
    </div>
  );
}

async function EditCustomer({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const customer = data as Customer;

  return (
    <>
      <PageHeader
        title="แก้ไขข้อมูลลูกค้า"
        description={customer.full_name}
        back={<BackLink href={`/customers/${id}`}>กลับไปหน้ารายละเอียด</BackLink>}
      />
      <CustomerForm
        action={updateCustomer.bind(null, id)}
        customer={customer}
        cancelHref={`/customers/${id}`}
      />
    </>
  );
}
