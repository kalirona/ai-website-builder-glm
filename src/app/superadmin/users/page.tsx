import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-guard"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminUserActions } from "@/components/admin/admin-user-actions"
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

export default async function SuperAdminUsersPage({
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

  const [users, total] = await Promise.all([
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
      take: limit,
      skip: offset,
    }),
    db.user.count(),
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
              <h1 className="text-lg font-semibold">Users</h1>
              <p className="text-xs text-muted-foreground">
                All registered users across the platform
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
                All users{" "}
                <span className="ml-1 text-muted-foreground">({total})</span>
              </CardTitle>
              <CardDescription>
                Showing {showingFrom}–{showingTo} of {total}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No users found.
                </div>
              ) : (
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
                        <TableCell className="pl-6 font-medium">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.name || "—"}
                        </TableCell>
                        <TableCell>
                          {u.role === "admin" ? (
                            <Badge className="bg-primary/10 text-primary">
                              admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">user</Badge>
                          )}
                          {u.id === admin.id ? (
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          {u._count.projects}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelative(u.createdAt)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <AdminUserActions
                            userId={u.id}
                            currentRole={u.role}
                            userEmail={u.email}
                            isSelf={u.id === admin.id}
                          />
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
                    <Link href={`/superadmin/users?offset=${prevOffset}&limit=${limit}`}>
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
                    <Link href={`/superadmin/users?offset=${nextOffset}&limit=${limit}`}>
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
