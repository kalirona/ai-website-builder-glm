import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { AppLogo } from "@/components/shared/app-logo"
import { CreateWebsiteDialog } from "@/components/dashboard/create-website-dialog"
import { ProjectCard } from "@/components/dashboard/project-card"
import { UserMenu } from "@/components/dashboard/user-menu"
import { Button } from "@/components/ui/button"
import { Plus, Layers, FileEdit, Globe } from "lucide-react"

export interface ProjectListItem {
  id: string
  name: string
  slug: string
  description: string | null
  businessType: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  hasWebsite: boolean
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as { id?: string }).id!
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) redirect("/login")

  const projects = await db.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: { website: { select: { id: true } } },
  })

  const list: ProjectListItem[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    businessType: p.businessType,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    hasWebsite: !!p.website,
  }))

  const published = list.filter((p) => p.status === "published").length
  const ready = list.filter(
    (p) => p.status === "ready" || p.status === "published"
  ).length

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <AppLogo href="/dashboard" />
          <div className="flex items-center gap-2">
            <CreateWebsiteDialog>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                New Website
              </Button>
            </CreateWebsiteDialog>
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your websites and create new ones with AI.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Layers} label="Total projects" value={list.length} />
          <StatCard icon={FileEdit} label="Ready to publish" value={ready} />
          <StatCard icon={Globe} label="Published" value={published} />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your websites</h2>
        </div>

        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Webcraft</span>
          <span>Built with AI</span>
        </div>
      </footer>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Plus className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">Create your first website</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Tell us about your business and our AI will generate a complete,
        editable website in seconds.
      </p>
      <div className="mt-6">
        <CreateWebsiteDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Website
          </Button>
        </CreateWebsiteDialog>
      </div>
    </div>
  )
}
