"use client";

import { useActionState } from "react";
import { signup } from "@/app/(auth)/actions";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";

export function SignupForm() {
  const [state, formAction] = useActionState(signup, null);

  if (state?.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="ชื่อ-นามสกุล" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </Field>
      <Field label="อีเมล" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
      </Field>
      <Field label="รหัสผ่าน" htmlFor="password" hint="อย่างน้อย 6 ตัวอักษร">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </Field>
      <Field label="ยืนยันรหัสผ่าน" htmlFor="confirm_password">
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </Field>
      <SubmitButton pendingText="กำลังสมัคร..." className="w-full">
        สมัครสมาชิก
      </SubmitButton>
    </form>
  );
}
