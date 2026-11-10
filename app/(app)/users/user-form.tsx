"use client";

import { useActionState } from "react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";
import type { FormState, Profile } from "@/lib/types";

export function UserForm({
  action,
  user,
  isSelf = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  user?: Profile;
  isSelf?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = !!user;

  return (
    <Card>
      <form action={formAction} className="space-y-5 p-5 sm:p-6">
        {state?.error && <Alert>{state.error}</Alert>}

        <Field label="ชื่อ-นามสกุล" htmlFor="full_name" required>
          <Input id="full_name" name="full_name" defaultValue={user?.full_name ?? ""} required />
        </Field>

        <Field
          label="อีเมล"
          htmlFor="email"
          required={!isEdit}
          hint={isEdit ? "เปลี่ยนอีเมลไม่ได้" : undefined}
        >
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            disabled={isEdit}
            required={!isEdit}
          />
        </Field>

        <Field
          label={isEdit ? "รหัสผ่านใหม่" : "รหัสผ่าน"}
          htmlFor="password"
          required={!isEdit}
          hint={isEdit ? "เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน" : "อย่างน้อย 6 ตัวอักษร"}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required={!isEdit}
          />
        </Field>

        <Field
          label="สิทธิ์การใช้งาน (Role)"
          htmlFor="role"
          hint={
            isSelf
              ? "ไม่สามารถเปลี่ยน role ของตัวเองได้"
              : "Admin: จัดการได้ทุกอย่าง · User: ดูข้อมูลลูกค้าได้อย่างเดียว"
          }
        >
          <Select id="role" name="role" defaultValue={user?.role ?? "user"} disabled={isSelf}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
          {/* select ที่ disabled จะไม่ถูกส่งไปกับฟอร์ม */}
          {isSelf && <input type="hidden" name="role" value="admin" />}
        </Field>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <LinkButton href="/users" variant="secondary">
            ยกเลิก
          </LinkButton>
          <SubmitButton>{isEdit ? "บันทึก" : "สร้างผู้ใช้"}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
