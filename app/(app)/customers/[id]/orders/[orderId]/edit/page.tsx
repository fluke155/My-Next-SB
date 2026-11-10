import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { updateOrder } from "../../../../actions";
import { OrderForm } from "../../order-form";

export const metadata: Metadata = { title: "แก้ไขออเดอร์" };

export default function EditOrderPage({
  params,
}: PageProps<"/customers/[id]/orders/[orderId]/edit">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditOrder params={params} />
      </Suspense>
    </div>
  );
}

async function EditOrder({ params }: { params: Promise<{ id: string; orderId: string }> }) {
  await requireAdmin();
  const { id, orderId } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("customer_id", id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as Order;

  let slipUrl: string | null = null;
  if (order.slip_path) {
    const { data: signed } = await supabase.storage
      .from("slips")
      .createSignedUrl(order.slip_path, 3600);
    slipUrl = signed?.signedUrl ?? null;
  }

  return (
    <>
      <PageHeader
        title="แก้ไขออเดอร์"
        back={<BackLink href={`/customers/${id}`}>กลับไปหน้าลูกค้า</BackLink>}
      />
      <OrderForm
        action={updateOrder.bind(null, id, orderId)}
        order={order}
        currentSlipUrl={slipUrl}
        defaultDate={todayISO()}
        cancelHref={`/customers/${id}`}
      />
    </>
  );
}
