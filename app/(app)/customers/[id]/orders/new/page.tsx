import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "../../../actions";
import { OrderForm } from "../order-form";

export const metadata: Metadata = { title: "เพิ่มออเดอร์" };

export default function NewOrderPage({ params }: PageProps<"/customers/[id]/orders/new">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewOrder params={params} />
      </Suspense>
    </div>
  );
}

async function NewOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title="เพิ่มออเดอร์"
        description={`ลูกค้า: ${customer.full_name}`}
        back={<BackLink href={`/customers/${id}`}>กลับไปหน้าลูกค้า</BackLink>}
      />
      <OrderForm
        action={createOrder.bind(null, id)}
        defaultDate={todayISO()}
        cancelHref={`/customers/${id}`}
      />
    </>
  );
}
