import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-guard"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { BootstrapAdminButton } from "@/components/admin/bootstrap-admin-button"
import { AdminUserActions } from "@/components/admin/admin-user-actions"
import { AdminProjectActions } from "@/components/admin/admin-project-actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, FolderKanban, Globe, FileText, ShieldCheck } from "lucide-react"
import { formatRelative } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function SuperAdminOverviewPage() {
  const admin = await requireAdmin()

  // Not authenticated → login.
  if (!admin) {
    // If no admins exist yet, show the one-shot bootstrap UI instead of
    // bouncing the user away. This is the supported "create the first admin"
    // path — no manual DB edits required.
    const adminCount = await db.user.count({ where: { role: "admin" } })
    if (adminCount === 0) {
      const { getCurrentUser } = await import("@/lib/auth-guard")
      const currentUser = await getCurrentUser()
      if (!currentUser) redirect("/login")
      return (
        <BootstrapScreen
          userEmail={currentUser.email}
          userName={currentUser.name}
        />
      )
    }
    redirect("/dashboard")
  }

  // Admin is authenticated — gather platform-wide data.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    totalProjects,
    totalWebsites,
    totalPages,
    publishedProjects,
    draftProjects,
    newUsers7d,
    newProjects7d,
    recentUsers,
    recentProjects,
  ] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.website.count(),
    db.page.count(),
    db.project.count({ where: { status: "published" } }),
    db.project.count({ where: { status: "draft" } }),
    db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.project.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.project.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        businessType: true,
        createdAt: true,
        owner: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  const stats = [
    { label: "Total users", value: totalUsers, icon: Users },
    { label: "Total projects", value: totalProjects, icon: FolderKanban },
    { label: "Total websites", value: totalWebsites, icon: Globe },
    { label: "Total pages", value: totalPages, icon: FileText },
  ]

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar userName={admin.name} userEmail={admin.email} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-lg font-semibold">Super Admin</h1>
              <p className="text-xs text-muted-foreground">
                Platform-wide oversight &amp; management
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          {/* Stat cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <Card key={s.label} className="gap-0">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold leading-none">
                        {s.value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Two-column summaries */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Projects</CardTitle>
                <CardDescription>Published vs draft</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6 pt-0">
                <Stat label="Published" value={publishedProjects} tone="primary" />
                <Stat label="Draft" value={draftProjects} tone="muted" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Last 7 days</CardTitle>
                <CardDescription>New sign-ups &amp; projects</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6 pt-0">
                <Stat label="New users" value={newUsers7d} tone="primary" />
                <Stat label="New projects" value={newProjects7d} tone="muted" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick links</CardTitle>
                <CardDescription>Manage by section</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 pt-0 text-sm">
                <a
                  href="/superadmin/users"
                  className="text-primary hover:underline"
                >
                  All users →
                </a>
                <a
                  href="/superadmin/projects"
                  className="text-primary hover:underline"
                >
                  All projects →
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Recent users */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Recent users</CardTitle>
              <CardDescription>
                Latest 10 sign-ups across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <UsersTable
                users={recentUsers.map((u) => ({
                  id: u.id,
                  email: u.email,
                  name: u.name,
                  role: u.role,
                  createdAt: u.createdAt,
                  projectCount: u._count.projects,
                  isSelf: u.id === admin.id,
                }))}
              />
            </CardContent>
          </Card>

          {/* Recent projects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent projects</CardTitle>
              <CardDescription>
                Latest 10 projects created across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProjectsTable
                projects={recentProjects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  status: p.status,
                  businessType: p.businessType,
                  createdAt: p.createdAt,
                  ownerEmail: p.owner.email,
                  ownerName: p.owner.name,
                }))}
              />
            </CardContent>
          </Card>
        </main>

        <footer className="mt-auto border-t bg-background">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-xs text-muted-foreground md:px-8">
            <span>© {new Date().getFullYear()} Webcraft — Super Admin</span>
            <span>Admin console</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "primary" | "muted"
}) {
  return (
    <div>
      <p
        className={`text-xl font-bold leading-none ${
          tone === "primary" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: Date
  projectCount: number
  isSelf: boolean
}

function UsersTable({ users }: { users: UserRow[] }) {
  if (users.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-muted-foreground">
        No users yet.
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-center">Projects</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="pr-6 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="pl-6 font-medium">{u.email}</TableCell>
            <TableCell className="text-muted-foreground">
              {u.name || "—"}
            </TableCell>
            <TableCell>
              {u.role === "admin" ? (
                <Badge className="bg-primary/10 text-primary">admin</Badge>
              ) : (
                <Badge variant="secondary">user</Badge>
              )}
              {u.isSelf ? (
                <span className="ml-2 text-[11px] text-muted-foreground">
                  (you)
                </span>
              ) : null}
            </TableCell>
            <TableCell className="text-center">{u.projectCount}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatRelative(u.createdAt)}
            </TableCell>
            <TableCell className="pr-6">
              <AdminUserActions
                userId={u.id}
                currentRole={u.role}
                userEmail={u.email}
                isSelf={u.isSelf}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface ProjectRow {
  id: string
  name: string
  slug: string
  status: string
  businessType: string | null
  createdAt: Date
  ownerEmail: string
  ownerName: string | null
}

function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  if (projects.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-muted-foreground">
        No projects yet.
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Project</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="pr-6 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="pl-6 font-medium">
              <span className="block truncate">{p.name}</span>
              <span className="block text-[11px] text-muted-foreground">
                /{p.slug}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              <span className="block truncate">{p.ownerEmail}</span>
              {p.ownerName ? (
                <span className="block text-[11px]">{p.ownerName}</span>
              ) : null}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{p.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {p.businessType || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatRelative(p.createdAt)}
            </TableCell>
            <TableCell className="pr-6 text-right">
              <div className="flex justify-end">
                <AdminProjectActions
                  projectId={p.id}
                  projectName={p.name}
                  ownerEmail={p.ownerEmail}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ---------- bootstrap screen ---------- */

function BootstrapScreen({
  userEmail,
  userName,
}: {
  userEmail: string
  userName: string | null
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>No admin exists yet</CardTitle>
          <CardDescription>
            This is a fresh deployment. Promote yourself to the Super Admin role
            to access the admin console. Bootstrap is a one-shot operation —
            once an admin exists, this endpoint is permanently disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-sm font-medium">{userName || "Signed in as"}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <BootstrapAdminButton userEmail={userEmail} />
          <a
            href="/dashboard"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Back to dashboard
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
