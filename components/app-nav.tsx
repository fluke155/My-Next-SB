"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCog, Users } from "lucide-react";
import type { Role } from "@/lib/types";

const items = [
  { href: "/customers", label: "ลูกค้า", icon: Users, adminOnly: false },
  { href: "/users", label: "ผู้ใช้งาน", icon: UserCog, adminOnly: true },
];

function useItems(role: Role) {
  const pathname = usePathname();
  return items
    .filter((item) => !item.adminOnly || role === "admin")
    .map((item) => ({ ...item, active: pathname.startsWith(item.href) }));
}

/** เมนูด้านข้างสำหรับจอใหญ่ */
export function SidebarNav({ role }: { role: Role }) {
  const navItems = useItems(role);
  return (
    <nav className="space-y-1">
      {navItems.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <Icon className="size-4.5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** แถบเมนูด้านล่างสำหรับมือถือ (แบบแอป) */
export function BottomNav({ role }: { role: Role }) {
  const navItems = useItems(role);
  if (navItems.length < 2) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pt-2 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-md justify-around">
        {navItems.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 text-xs font-medium ${
              active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
