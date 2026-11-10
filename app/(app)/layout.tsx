import Link from "next/link";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { BottomNav, SidebarNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { RoleBadge, Skeleton } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { initials } from "@/lib/format";

/**
 * โครงหน้าหลัง login
 * ส่วนที่ต้องรู้ว่าใคร login อยู่ (เมนู, ชื่อ, role) อยู่ใน <Suspense>
 * ส่วนอื่นของโครงหน้าเป็น static shell ตามกฎ cacheComponents
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-950">
        <div className="flex h-16 items-center px-5">
          <Link href="/customers">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-between px-3 py-4">
          <Suspense fallback={<NavSkeleton />}>
            <SessionSidebar />
          </Suspense>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <Link href="/customers">
          <Logo />
        </Link>
        <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
          <SessionMobileMenu />
        </Suspense>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        {children}
      </main>

      <Suspense fallback={null}>
        <SessionBottomNav />
      </Suspense>
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

function LogoutButton({ withLabel }: { withLabel: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        title="ออกจากระบบ"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
      >
        <LogOut className="size-4.5" />
        {withLabel ? "ออกจากระบบ" : <span className="sr-only">ออกจากระบบ</span>}
      </button>
    </form>
  );
}

async function SessionSidebar() {
  const profile = await requireUser();
  return (
    <>
      <SidebarNav role={profile.role} />
      <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {initials(profile.full_name || profile.email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {profile.full_name || "ไม่ระบุชื่อ"}
            </p>
            <div className="flex items-center gap-1.5">
              <RoleBadge role={profile.role} />
            </div>
          </div>
        </div>
        <LogoutButton withLabel />
      </div>
    </>
  );
}

async function SessionMobileMenu() {
  const profile = await requireUser();
  return (
    <div className="flex items-center gap-2">
      <RoleBadge role={profile.role} />
      <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {initials(profile.full_name || profile.email)}
      </div>
      <LogoutButton withLabel={false} />
    </div>
  );
}

async function SessionBottomNav() {
  const profile = await requireUser();
  return <BottomNav role={profile.role} />;
}
