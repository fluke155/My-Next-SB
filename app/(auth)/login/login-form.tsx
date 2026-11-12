"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/(auth)/actions";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/misc";

export function LoginForm() {
  const [state, formAction] = useActionState(login, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
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
      <Field label="รหัสผ่าน" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <SubmitButton pendingText="กำลังเข้าสู่ระบบ..." className="w-full">
        เข้าสู่ระบบ
      </SubmitButton>
    </form>
  );
}

/** error ที่ส่งกลับมาจาก /auth/callback ผ่าน ?error= */
export function CallbackError() {
  const error = useSearchParams().get("error");
  return error ? <Alert>{error}</Alert> : null;
}
