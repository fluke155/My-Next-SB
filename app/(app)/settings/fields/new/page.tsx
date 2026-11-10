import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { getCustomFields } from "@/lib/custom-fields";
import { createClient } from "@/lib/supabase/server";
import { createField } from "../actions";
import { FieldForm } from "../field-form";

export const metadata: Metadata = { title: "เพิ่มฟิลด์" };

export default function NewFieldPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="เพิ่มฟิลด์"
        description="ช่องใหม่จะแสดงในฟอร์มลูกค้าทันทีหลังบันทึก"
        back={<BackLink href="/settings/fields">กลับไปหน้าตั้งค่าฟิลด์</BackLink>}
      />
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <NewField />
      </Suspense>
    </div>
  );
}

async function NewField() {
  await requireAdmin();
  const fields = await getCustomFields(await createClient(), { includeInactive: true });
  // ต่อท้ายฟิลด์ล่าสุด เว้นทีละ 10 จะได้แทรกระหว่างกลางได้
  const nextSortOrder = fields.length ? Math.max(...fields.map((f) => f.sort_order)) + 10 : 10;
  return <FieldForm action={createField} nextSortOrder={nextSortOrder} />;
}
