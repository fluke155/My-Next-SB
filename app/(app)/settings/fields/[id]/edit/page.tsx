import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CustomField } from "@/lib/types";
import { updateField } from "../../actions";
import { FieldForm } from "../../field-form";

export const metadata: Metadata = { title: "แก้ไขฟิลด์" };

export default function EditFieldPage({ params }: PageProps<"/settings/fields/[id]/edit">) {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="แก้ไขฟิลด์"
        back={<BackLink href="/settings/fields">กลับไปหน้าตั้งค่าฟิลด์</BackLink>}
      />
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <EditField params={params} />
      </Suspense>
    </div>
  );
}

async function EditField({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.from("customer_fields").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return <FieldForm action={updateField.bind(null, id)} field={data as CustomField} />;
}
