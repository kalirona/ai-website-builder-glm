import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SettingsForm } from "@/components/dashboard/settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const userId = (session.user as { id?: string }).id!
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) redirect("/login")

  return (
    <div className="flex min-h-screen bg-muted/30">
      <DashboardSidebar userName={user.name} userEmail={user.email} role={user.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center px-4 md:px-8">
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8">
          <SettingsForm initialName={user.name ?? ""} email={user.email} />
        </main>
      </div>
    </div>
  )
}
