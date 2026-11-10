import type { Metadata } from "next";
import { Suspense } from "react";
import { EyeOff, Pencil, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/form-controls";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { fieldTypeLabel } from "@/lib/custom-fields";
import { createClient } from "@/lib/supabase/server";
import type { CustomField } from "@/lib/types";
import { deleteField } from "./actions";

export const metadata: Metadata = { title: "ตั้งค่าฟิลด์ลูกค้า" };

export default function FieldSettingsPage() {
  return (
    <>
      <PageHeader
        title="ตั้งค่าฟิลด์ลูกค้า"
        description="เพิ่มช่องข้อมูลลูกค้าเองได้ ไม่ต้องแก้โค้ด (เฉพาะ Admin)"
        action={
          <LinkButton href="/settings/fields/new">
            <Plus className="size-4" />
            เพิ่มฟิลด์
          </LinkButton>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton rows={3} />}>
          <FieldList />
        </Suspense>
      </Card>
    </>
  );
}

async function FieldList() {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_fields")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-5">
        <Alert>
          โหลดข้อมูลไม่สำเร็จ: {error.message}
          <br />
          ถ้ายังไม่ได้รัน <code>supabase/migrations/003_customer_custom_fields.sql</code> ใน SQL
          Editor ให้รันก่อน
        </Alert>
      </div>
    );
  }

  const fields = (data ?? []) as CustomField[];
  if (fields.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีฟิลด์เพิ่มเติม"
        description="เพิ่มฟิลด์ เช่น LINE ID หรือประเภทลูกค้า แล้วช่องจะโผล่ในฟอร์มลูกค้าทันที"
        action={
          <LinkButton href="/settings/fields/new">
            <Plus className="size-4" />
            เพิ่มฟิลด์
          </LinkButton>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {fields.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <span className="w-8 shrink-0 text-center text-xs text-slate-400">{f.sort_order}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`font-medium ${f.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}`}
              >
                {f.label}
              </p>
              {f.required && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  บังคับ
                </span>
              )}
              {!f.is_active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                  <EyeOff className="size-3" />
                  ซ่อนอยู่
                </span>
              )}
            </div>
            <p className="truncate text-sm text-slate-500">
              {fieldTypeLabel(f.type)}
              {f.type === "select" && f.options.length > 0 && ` · ${f.options.join(", ")}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <LinkButton
              href={`/settings/fields/${f.id}/edit`}
              variant="ghost"
              size="sm"
              aria-label="แก้ไข"
              title="แก้ไข"
            >
              <Pencil className="size-4" />
            </LinkButton>
            <DeleteButton
              compact
              action={deleteField.bind(null, f.id)}
              confirmText={`ลบฟิลด์ "${f.label}"?\n\nข้อมูลในฟิลด์นี้ของลูกค้าทุกคนจะถูกลบถาวร\n(ถ้าแค่ไม่อยากให้แสดง ให้กดแก้ไขแล้วปิด "แสดงฟิลด์นี้" แทน)`}
              label="ลบฟิลด์"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
