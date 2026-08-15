"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  FolderKanban,
  ArrowLeft,
  LogOut,
} from "lucide-react"
import { AppLogo } from "@/components/shared/app-logo"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { cn, initials } from "@/lib/utils"

interface AdminNavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/superadmin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/superadmin/users", label: "Users", icon: Users },
  { href: "/superadmin/projects", label: "Projects", icon: FolderKanban },
]

export function AdminSidebar({
  userName,
  userEmail,
}: {
  userName: string | null
  userEmail: string
}) {
  const pathname = usePathname()

  const isActive = (item: AdminNavItem) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href)

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      {/* Logo + admin badge */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <AppLogo href="/superadmin" size="sm" />
        <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <ShieldCheck className="h-3 w-3" />
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Back to user dashboard */}
      <div className="border-t p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to User Dashboard
        </Link>
      </div>

      {/* User + logout */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials(userName || userEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{userName || "Admin"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
