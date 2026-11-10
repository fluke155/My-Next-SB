import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { FileImage, Mail, MapPin, Pencil, Phone, Plus, ReceiptText } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/form-controls";
import { BackLink, EmptyState, Skeleton, TableSkeleton } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { formatDate, formatTHB, initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Customer, Order } from "@/lib/types";
import { deleteCustomer, deleteOrder } from "../actions";

export const metadata: Metadata = { title: "รายละเอียดลูกค้า" };

export default function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <>
      <div className="mb-4">
        <BackLink href="/customers">กลับไปหน้าลูกค้า</BackLink>
      </div>
      <Suspense fallback={<DetailSkeleton />}>
        <CustomerDetail params={params} />
      </Suspense>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Card className="lg:col-span-2">
          <TableSkeleton rows={3} />
        </Card>
      </div>
    </div>
  );
}

async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser();
  const isAdmin = profile.role === "admin";
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: customerData }, { data: ordersData }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!customerData) notFound();
  const customer = customerData as Customer;
  const orders = (ordersData ?? []) as Order[];

  // สร้างลิงก์ชั่วคราว (1 ชม.) ให้รูปสลิปใน bucket แบบ private
  const slipPaths = orders.map((o) => o.slip_path).filter((p): p is string => !!p);
  const slipUrls = new Map<string, string>();
  if (slipPaths.length) {
    const { data: signed } = await supabase.storage.from("slips").createSignedUrls(slipPaths, 3600);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) slipUrls.set(s.path, s.signedUrl);
    });
  }

  const total = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-indigo-600 text-xl font-semibold text-white shadow-sm">
            {initials(customer.full_name)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {customer.full_name}
            </h1>
            {customer.nickname && <p className="text-slate-500">ชื่อเล่น: {customer.nickname}</p>}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <LinkButton href={`/customers/${id}/edit`} variant="secondary">
              <Pencil className="size-4" />
              แก้ไข
            </LinkButton>
            <DeleteButton
              action={deleteCustomer.bind(null, id)}
              confirmText={`ลบลูกค้า "${customer.full_name}" และประวัติการสั่งซื้อทั้งหมด? การลบนี้ย้อนกลับไม่ได้`}
              label="ลบลูกค้า"
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ข้อมูลติดต่อ */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="ข้อมูลติดต่อ" />
            <dl className="space-y-4 p-5 text-sm">
              <InfoRow icon={<Phone className="size-4" />} label="เบอร์โทร">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="text-indigo-600 hover:underline">
                    {customer.phone}
                  </a>
                ) : (
                  "-"
                )}
              </InfoRow>
              <InfoRow icon={<Mail className="size-4" />} label="อีเมล">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="break-all text-indigo-600 hover:underline">
                    {customer.email}
                  </a>
                ) : (
                  "-"
                )}
              </InfoRow>
              <InfoRow icon={<MapPin className="size-4" />} label="ที่อยู่">
                <span className="whitespace-pre-line">{customer.address || "-"}</span>
              </InfoRow>
            </dl>
          </Card>

          <Card className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-5">
              <p className="text-xs text-slate-500">จำนวนออเดอร์</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                {orders.length}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">ยอดซื้อรวม</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                {formatTHB(total)}
              </p>
            </div>
          </Card>
        </div>

        {/* ประวัติการสั่งซื้อ */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="ประวัติการสั่งซื้อ"
            description="รายการสั่งซื้อพร้อมรูปสลิป"
            action={
              isAdmin && (
                <LinkButton href={`/customers/${id}/orders/new`} size="sm">
                  <Plus className="size-4" />
                  เพิ่มออเดอร์
                </LinkButton>
              )
            }
          />
          {orders.length === 0 ? (
            <EmptyState title="ยังไม่มีประวัติการสั่งซื้อ" />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {orders.map((order) => {
                const slipUrl = order.slip_path ? slipUrls.get(order.slip_path) : undefined;
                return (
                  <li key={order.id} className="flex gap-4 p-4 sm:p-5">
                    {slipUrl ? (
                      <a
                        href={slipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative size-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                        title="ดูสลิปขนาดเต็ม"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL หมดอายุ ไม่ต้อง optimize */}
                        <img
                          src={slipUrl}
                          alt={`สลิปออเดอร์วันที่ ${formatDate(order.order_date)}`}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
                        <FileImage className="size-5" />
                        <span className="text-[10px]">ไม่มีสลิป</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-semibold text-slate-900 dark:text-white">
                            {formatTHB(order.total_amount)}
                          </p>
                          <p className="flex items-center gap-1.5 text-sm text-slate-500">
                            <ReceiptText className="size-3.5" />
                            {formatDate(order.order_date)}
                          </p>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <LinkButton
                              href={`/customers/${id}/orders/${order.id}/edit`}
                              variant="ghost"
                              size="sm"
                              aria-label="แก้ไขออเดอร์"
                              title="แก้ไขออเดอร์"
                            >
                              <Pencil className="size-4" />
                            </LinkButton>
                            <DeleteButton
                              compact
                              action={deleteOrder.bind(null, id, order.id)}
                              confirmText="ลบออเดอร์นี้และรูปสลิป?"
                              label="ลบออเดอร์"
                            />
                          </div>
                        )}
                      </div>
                      {order.note && (
                        <p className="mt-2 text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">
                          {order.note}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-slate-900 dark:text-slate-100">{children}</dd>
      </div>
    </div>
  );
}
