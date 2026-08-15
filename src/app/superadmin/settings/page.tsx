import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-guard"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminSettingsForm } from "@/components/admin/admin-settings-form"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SuperAdminSettingsPage() {
  const admin = await requireAdmin()
  if (!admin) {
    const adminCount = await db.user.count({ where: { role: "admin" } })
    if (adminCount === 0) redirect("/superadmin")
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar userName={admin.name} userEmail={admin.email} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-lg font-semibold">Platform Settings</h1>
              <p className="text-xs text-muted-foreground">
                Configure platform-wide behavior, defaults, and feature flags
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">
          <AdminSettingsForm />
        </main>

        <footer className="mt-auto border-t bg-background">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-xs text-muted-foreground md:px-8">
            <span>© {new Date().getFullYear()} Webcraft — Super Admin</span>
            <span>Admin console</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
