import type { Metadata } from "next";
import { Suspense } from "react";
import { Pencil, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/form-controls";
import { EmptyState, RoleBadge, TableSkeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { formatDate, initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { deleteUser } from "./actions";

export const metadata: Metadata = { title: "ผู้ใช้งาน" };

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="ผู้ใช้งาน"
        description="จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง (เฉพาะ Admin)"
        action={
          <LinkButton href="/users/new">
            <Plus className="size-4" />
            เพิ่มผู้ใช้
          </LinkButton>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <UsersTable />
        </Suspense>
      </Card>
    </>
  );
}

async function UsersTable() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return <p className="p-5 text-sm text-rose-600">โหลดข้อมูลไม่สำเร็จ: {error.message}</p>;
  }
  const users = (data ?? []) as Profile[];
  if (users.length === 0) return <EmptyState title="ยังไม่มีผู้ใช้" />;

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {users.map((u) => {
        const isSelf = u.id === me.id;
        return (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {initials(u.full_name || u.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {u.full_name || "ไม่ระบุชื่อ"}
                </p>
                <RoleBadge role={u.role} />
                {isSelf && <span className="text-xs text-slate-400">(คุณ)</span>}
              </div>
              <p className="truncate text-sm text-slate-500">
                {u.email}
                <span className="hidden sm:inline"> · สมัครเมื่อ {formatDate(u.created_at)}</span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <LinkButton
                href={`/users/${u.id}/edit`}
                variant="ghost"
                size="sm"
                aria-label="แก้ไข"
                title="แก้ไข"
              >
                <Pencil className="size-4" />
              </LinkButton>
              {!isSelf && (
                <DeleteButton
                  compact
                  action={deleteUser.bind(null, u.id)}
                  confirmText={`ลบบัญชี "${u.full_name || u.email}"? ผู้ใช้นี้จะเข้าสู่ระบบไม่ได้อีก`}
                  label="ลบผู้ใช้"
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
