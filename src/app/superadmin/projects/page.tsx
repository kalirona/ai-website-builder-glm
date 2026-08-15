import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-guard"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminProjectActions } from "@/components/admin/admin-project-actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react"
import { formatRelative } from "@/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 25

interface SearchParams {
  offset?: string
  limit?: string
}

export default async function SuperAdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const admin = await requireAdmin()
  if (!admin) {
    const adminCount = await db.user.count({ where: { role: "admin" } })
    if (adminCount === 0) redirect("/superadmin")
    redirect("/dashboard")
  }

  const sp = await searchParams
  const offset = Math.max(
    0,
    Number.parseInt(sp.offset ?? "0", 10) || 0
  )
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(sp.limit ?? String(PAGE_SIZE), 10) || PAGE_SIZE)
  )

  const [projects, total] = await Promise.all([
    db.project.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        businessType: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.project.count(),
  ])

  const showingFrom = total === 0 ? 0 : offset + 1
  const showingTo = Math.min(offset + limit, total)
  const hasPrev = offset > 0
  const hasNext = offset + limit < total
  const prevOffset = Math.max(0, offset - limit)
  const nextOffset = offset + limit

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar userName={admin.name} userEmail={admin.email} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-lg font-semibold">Projects</h1>
              <p className="text-xs text-muted-foreground">
                All projects across all users
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                All projects{" "}
                <span className="ml-1 text-muted-foreground">({total})</span>
              </CardTitle>
              <CardDescription>
                Showing {showingFrom}–{showingTo} of {total}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No projects found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Project</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
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
                          <span className="block truncate">{p.owner.email}</span>
                          {p.owner.name ? (
                            <span className="block text-[11px]">
                              {p.owner.name}
                            </span>
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
                        <TableCell className="text-muted-foreground">
                          {formatRelative(p.updatedAt)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end">
                            <AdminProjectActions
                              projectId={p.id}
                              projectName={p.name}
                              ownerEmail={p.owner.email}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {total > limit ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {Math.floor(offset / limit) + 1} of{" "}
                {Math.max(1, Math.ceil(total / limit))}
              </p>
              <div className="flex gap-2">
                {hasPrev ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/superadmin/projects?offset=${prevOffset}&limit=${limit}`}>
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                )}
                {hasNext ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/superadmin/projects?offset=${nextOffset}&limit=${limit}`}>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : null}
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
