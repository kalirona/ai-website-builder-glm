import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * GET /api/admin/users?limit=50&offset=0
 *
 * Returns all users with their project counts. PasswordHash is never selected.
 * Admin-only.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorizedResponse()
    return forbiddenResponse()
  }

  const url = new URL(req.url)
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "50", 10)
  const offsetParam = Number.parseInt(url.searchParams.get("offset") ?? "0", 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0

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

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      projectCount: u._count.projects,
    })),
    total,
    limit,
    offset,
  })
}
