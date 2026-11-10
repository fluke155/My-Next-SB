"use client";

import { useActionState } from "react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import { fieldInputName } from "@/lib/custom-fields";
import type { CustomField, Customer, FormState } from "@/lib/types";

/** สร้างช่องกรอก 1 ช่องตามชนิดของฟิลด์ */
function CustomFieldInput({ field, value }: { field: CustomField; value: unknown }) {
  const name = fieldInputName(field);
  const id = name;
  const text = value === undefined || value === null ? "" : String(value);

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2.5 self-end rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={value === true}
          className="size-4 rounded border-slate-300 text-indigo-600"
        />
        {field.label}
      </label>
    );
  }

  return (
    <Field
      label={field.label}
      htmlFor={id}
      required={field.required}
      className={field.type === "textarea" ? "sm:col-span-2" : ""}
    >
      {field.type === "textarea" ? (
        <Textarea id={id} name={name} rows={3} defaultValue={text} required={field.required} />
      ) : field.type === "select" ? (
        <Select id={id} name={name} defaultValue={text} required={field.required}>
          <option value="">- เลือก -</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          id={id}
          name={name}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          step={field.type === "number" ? "any" : undefined}
          inputMode={field.type === "number" ? "decimal" : undefined}
          defaultValue={text}
          required={field.required}
        />
      )}
    </Field>
  );
}

export function CustomerForm({
  action,
  customer,
  cancelHref,
  maxBirthDate,
  fields,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  customer?: Customer;
  cancelHref: string;
  /** วันนี้ (YYYY-MM-DD) ส่งมาจาก server กันเลือกวันเกิดในอนาคต */
  maxBirthDate: string;
  /** Custom Fields ที่เปิดใช้งาน (สร้างช่องกรอกอัตโนมัติ) */
  fields: CustomField[];
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
            <Field label="วันเดือนปีเกิด" htmlFor="birth_date">
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                min="1900-01-01"
                max={maxBirthDate}
                defaultValue={customer?.birth_date ?? ""}
              />
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

        {fields.length > 0 && (
          <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">ข้อมูลเพิ่มเติม</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <CustomFieldInput
                  key={field.id}
                  field={field}
                  value={customer?.extra?.[field.key]}
                />
              ))}
            </div>
          </section>
        )}

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
