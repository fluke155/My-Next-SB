import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/card";
import { BackLink, Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { updateUser } from "../../actions";
import { UserForm } from "../../user-form";

export const metadata: Metadata = { title: "แก้ไขผู้ใช้" };

export default function EditUserPage({ params }: PageProps<"/users/[id]/edit">) {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="แก้ไขผู้ใช้" back={<BackLink href="/users">กลับไปหน้าผู้ใช้งาน</BackLink>} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditUser params={params} />
      </Suspense>
    </div>
  );
}

async function EditUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <UserForm action={updateUser.bind(null, id)} user={data as Profile} isSelf={id === me.id} />
  );
}
