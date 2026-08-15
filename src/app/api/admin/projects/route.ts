import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * GET /api/admin/projects?limit=50&offset=0
 *
 * Returns all projects across all users with their owner's email + name.
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

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      businessType: p.businessType,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      owner: {
        email: p.owner.email,
        name: p.owner.name,
      },
    })),
    total,
    limit,
    offset,
  })
}
