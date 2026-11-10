"use client";

import { useActionState } from "react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import type { Customer, FormState } from "@/lib/types";

export function CustomerForm({
  action,
  customer,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  customer?: Customer;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <Card>
      <form action={formAction} className="space-y-6 p-5 sm:p-6">
        {state?.error && <Alert>{state.error}</Alert>}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">ข้อมูลทั่วไป</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อจริง-นามสกุล" htmlFor="full_name" required>
              <Input id="full_name" name="full_name" defaultValue={customer?.full_name} required />
            </Field>
            <Field label="ชื่อเล่น" htmlFor="nickname">
              <Input id="nickname" name="nickname" defaultValue={customer?.nickname ?? ""} />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">ข้อมูลติดต่อ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="เบอร์โทร" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="08x-xxx-xxxx"
                defaultValue={customer?.phone ?? ""}
              />
            </Field>
            <Field label="อีเมล" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                defaultValue={customer?.email ?? ""}
              />
            </Field>
          </div>
          <Field label="ที่อยู่" htmlFor="address">
            <Textarea id="address" name="address" rows={3} defaultValue={customer?.address ?? ""} />
          </Field>
        </section>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          <LinkButton href={cancelHref} variant="secondary">
            ยกเลิก
          </LinkButton>
          <SubmitButton>บันทึก</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
