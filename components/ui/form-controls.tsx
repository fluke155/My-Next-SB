"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** ปุ่ม submit ที่ขึ้น loading ระหว่างส่งฟอร์ม */
export function SubmitButton({
  children,
  pendingText = "กำลังบันทึก...",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "danger" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingText : children}
    </Button>
  );
}

function DeleteSubmit({ label, compact }: { label: string; compact: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={compact ? "ghost" : "danger"}
      size="sm"
      disabled={pending}
      aria-label={label}
      title={label}
      className={compact ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10" : ""}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {!compact && label}
    </Button>
  );
}

/**
 * ปุ่มลบที่ถามยืนยันก่อน
 * action คือ Server Action ที่ bind id ไว้แล้ว
 */
export function DeleteButton({
  action,
  confirmText,
  label = "ลบ",
  compact = false,
}: {
  action: () => Promise<void>;
  confirmText: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <DeleteSubmit label={label} compact={compact} />
    </form>
  );
}
