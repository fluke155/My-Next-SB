"use client";

import { useActionState, useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import type { FormState, Order } from "@/lib/types";

export function OrderForm({
  action,
  order,
  currentSlipUrl,
  defaultDate,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  order?: Order;
  currentSlipUrl?: string | null;
  defaultDate: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeSlip, setRemoveSlip] = useState(false);

  // คืนหน่วยความจำของ object URL เมื่อเปลี่ยนรูป
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shownSlip = preview ?? (removeSlip ? null : currentSlipUrl);

  return (
    <Card>
      <form action={formAction} className="space-y-6 p-5 sm:p-6">
        {state?.error && <Alert>{state.error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันที่สั่งซื้อ" htmlFor="order_date" required>
            <Input
              id="order_date"
              name="order_date"
              type="date"
              defaultValue={order?.order_date ?? defaultDate}
              required
            />
          </Field>
          <Field label="ยอดรวม (บาท)" htmlFor="total_amount" required>
            <Input
              id="total_amount"
              name="total_amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              defaultValue={order?.total_amount ?? ""}
              required
            />
          </Field>
        </div>

        <Field label="รายการสินค้า / หมายเหตุ" htmlFor="note">
          <Textarea
            id="note"
            name="note"
            rows={4}
            placeholder="เช่น เสื้อยืด x2, กางเกง x1"
            defaultValue={order?.note ?? ""}
          />
        </Field>

        <Field label="รูปสลิป" htmlFor="slip" hint="JPG, PNG หรือ WEBP ไม่เกิน 5 MB">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex size-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              {shownSlip ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview จาก object URL / signed URL
                <img src={shownSlip} alt="ตัวอย่างสลิป" className="size-full object-contain" />
              ) : (
                <ImagePlus className="size-8 text-slate-400" />
              )}
            </div>
            <div className="space-y-3">
              <input
                id="slip"
                name="slip"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setPreview(file ? URL.createObjectURL(file) : null);
                  if (file) setRemoveSlip(false);
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300 dark:file:bg-indigo-500/10 dark:file:text-indigo-300"
              />
              {currentSlipUrl && !preview && (
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    name="remove_slip"
                    checked={removeSlip}
                    onChange={(e) => setRemoveSlip(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-indigo-600"
                  />
                  <X className="size-3.5" />
                  เอาสลิปเดิมออก
                </label>
              )}
              {order && currentSlipUrl && (
                <p className="text-xs text-slate-500">เลือกไฟล์ใหม่เพื่อแทนที่สลิปเดิม</p>
              )}
            </div>
          </div>
        </Field>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          <LinkButton href={cancelHref} variant="secondary">
            ยกเลิก
          </LinkButton>
          <SubmitButton pendingText="กำลังอัปโหลด...">บันทึกออเดอร์</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
