import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Mail, Pencil, Phone, Plus, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/form-controls";
import { EmptyState, Skeleton, TableSkeleton } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";
import { deleteCustomer } from "./actions";

export const metadata: Metadata = { title: "ลูกค้า" };

type CustomerRow = Customer & { orders: { count: number }[] };

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersContent searchParams={searchParams} />
    </Suspense>
  );
}

function CustomersSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Card>
        <TableSkeleton />
      </Card>
    </>
  );
}

/** กันอักขระพิเศษที่จะทำให้ filter ของ PostgREST พัง */
function sanitizeSearch(q: string) {
  return q.replace(/[,()*%\\]/g, " ").trim().slice(0, 100);
}

async function CustomersContent({
  searchParams,
}: {
  searchParams: PageProps<"/customers">["searchParams"];
}) {
  const profile = await requireUser();
  const isAdmin = profile.role === "admin";
  const params = await searchParams;
  const q = sanitizeSearch(typeof params.q === "string" ? params.q : "");

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("*, orders(count)")
    .order("created_at", { ascending: false });
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,nickname.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }
  const { data, error } = await query;
  const customers = (data ?? []) as CustomerRow[];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            ลูกค้า
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isAdmin
              ? "จัดการข้อมูลลูกค้าและประวัติการสั่งซื้อ"
              : "ดูข้อมูลลูกค้าและประวัติการสั่งซื้อ (อ่านอย่างเดียว)"}
          </p>
        </div>
        {isAdmin && (
          <LinkButton href="/customers/new">
            <Plus className="size-4" />
            เพิ่มลูกค้า
          </LinkButton>
        )}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <form className="relative w-full max-w-sm" action="/customers">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="ค้นหาชื่อ ชื่อเล่น เบอร์โทร อีเมล"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
          </form>
          <p className="text-sm text-slate-500">ทั้งหมด {customers.length} รายการ</p>
        </div>

        {error ? (
          <p className="p-5 text-sm text-rose-600">โหลดข้อมูลไม่สำเร็จ: {error.message}</p>
        ) : customers.length === 0 ? (
          <EmptyState
            title={q ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีข้อมูลลูกค้า"}
            description={q ? "ลองเปลี่ยนคำค้นหา" : isAdmin ? "เริ่มเพิ่มลูกค้าคนแรกได้เลย" : undefined}
            action={
              isAdmin && !q ? (
                <LinkButton href="/customers/new">
                  <Plus className="size-4" />
                  เพิ่มลูกค้า
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop: ตาราง */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-3">ชื่อ</th>
                    <th className="px-5 py-3">ติดต่อ</th>
                    <th className="px-5 py-3 text-center">ออเดอร์</th>
                    <th className="px-5 py-3 text-right">
                      <span className="sr-only">จัดการ</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={c.full_name} />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{c.full_name}</p>
                            {c.nickname && <p className="text-xs text-slate-500">({c.nickname})</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        <div className="space-y-0.5">
                          {c.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="size-3.5 text-slate-400" />
                              {c.phone}
                            </p>
                          )}
                          {c.email && (
                            <p className="flex items-center gap-1.5">
                              <Mail className="size-3.5 text-slate-400" />
                              {c.email}
                            </p>
                          )}
                          {!c.phone && !c.email && <span className="text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex min-w-8 justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {c.orders?.[0]?.count ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <>
                              <LinkButton
                                href={`/customers/${c.id}/edit`}
                                variant="ghost"
                                size="sm"
                                aria-label="แก้ไข"
                                title="แก้ไข"
                              >
                                <Pencil className="size-4" />
                              </LinkButton>
                              <DeleteButton
                                compact
                                action={deleteCustomer.bind(null, c.id)}
                                confirmText={`ลบลูกค้า "${c.full_name}" และประวัติการสั่งซื้อทั้งหมด?`}
                              />
                            </>
                          )}
                          <LinkButton
                            href={`/customers/${c.id}`}
                            variant="ghost"
                            size="sm"
                            aria-label="ดูรายละเอียด"
                          >
                            <ChevronRight className="size-4" />
                          </LinkButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: การ์ด */}
            <ul className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/customers/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/40"
                  >
                    <Avatar name={c.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {c.full_name}
                        {c.nickname && (
                          <span className="font-normal text-slate-500"> ({c.nickname})</span>
                        )}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {c.phone || c.email || "ไม่มีข้อมูลติดต่อ"} · {c.orders?.[0]?.count ?? 0} ออเดอร์
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
      {initials(name)}
    </div>
  );
}
