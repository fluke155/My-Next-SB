"use client";

import { useActionState, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import { FIELD_TYPES } from "@/lib/custom-fields";
import type { CustomField, CustomFieldType, FormState } from "@/lib/types";

export function FieldForm({
  action,
  field,
  nextSortOrder = 0,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  field?: CustomField;
  nextSortOrder?: number;
}) {
  const [state, formAction] = useActionState(action, null);
  const [type, setType] = useState<CustomFieldType>(field?.type ?? "text");
  const isEdit = !!field;

  return (
    <Card>
      <form action={formAction} className="space-y-5 p-5 sm:p-6">
        {state?.error && <Alert>{state.error}</Alert>}

        <Field label="ชื่อฟิลด์ (ที่แสดงในฟอร์ม)" htmlFor="label" required>
          <Input
            id="label"
            name="label"
            maxLength={60}
            placeholder="เช่น LINE ID, ประเภทลูกค้า"
            defaultValue={field?.label}
            required
          />
        </Field>

        <Field
          label="ชนิดข้อมูล"
          htmlFor="type"
          required
          hint={isEdit ? "เปลี่ยนชนิดหลังสร้างไม่ได้ (กันข้อมูลเดิมเพี้ยน)" : undefined}
        >
          <Select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as CustomFieldType)}
            disabled={isEdit}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        {type === "select" && (
          <Field
            label="ตัวเลือก"
            htmlFor="options"
            required
            hint="บรรทัดละ 1 ตัวเลือก ถ้าลบตัวเลือกที่ลูกค้าเคยเลือกไว้ ค่านั้นจะหายตอนแก้ไขลูกค้าครั้งถัดไป"
          >
            <Textarea
              id="options"
              name="options"
              rows={5}
              placeholder={"ลูกค้าปลีก\nลูกค้าส่ง\nVIP"}
              defaultValue={field?.options.join("\n")}
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ลำดับการแสดง" htmlFor="sort_order" hint="เลขน้อยแสดงก่อน">
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              step="1"
              defaultValue={field?.sort_order ?? nextSortOrder}
            />
          </Field>
        </div>

        <div className="space-y-3">
          {type !== "checkbox" && (
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                name="required"
                defaultChecked={field?.required}
                className="size-4 rounded border-slate-300 text-indigo-600"
              />
              บังคับกรอก
            </label>
          )}
          {isEdit && (
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={field.is_active}
                className="size-4 rounded border-slate-300 text-indigo-600"
              />
              แสดงฟิลด์นี้ (ถ้าปิด จะซ่อนจากฟอร์มและหน้าลูกค้า แต่ข้อมูลเดิมยังเก็บไว้)
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <LinkButton href="/settings/fields" variant="secondary">
            ยกเลิก
          </LinkButton>
          <SubmitButton>{isEdit ? "บันทึก" : "เพิ่มฟิลด์"}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
