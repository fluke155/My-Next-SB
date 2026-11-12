import { Contact } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
        <Contact className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Customer Manager</p>
          <p className="text-xs text-slate-500">ระบบจัดการลูกค้า</p>
        </div>
      )}
    </div>
  );
}
