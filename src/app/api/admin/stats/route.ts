import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * GET /api/admin/stats — platform-wide statistics.
 * Admin-only.
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    // Distinguish 401 (not logged in) from 403 (logged in but not admin).
    const session = await getServerSession(authOptions)
    if (!session) return unauthorizedResponse()
    return forbiddenResponse()
  }

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
  ] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.website.count(),
    db.page.count(),
    db.project.count({ where: { status: "published" } }),
    db.project.count({ where: { status: "draft" } }),
    db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.project.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ])

  return NextResponse.json({
    totals: {
      users: totalUsers,
      projects: totalProjects,
      websites: totalWebsites,
      pages: totalPages,
    },
    projects: {
      published: publishedProjects,
      draft: draftProjects,
    },
    last7Days: {
      newUsers: newUsers7d,
      newProjects: newProjects7d,
    },
  })
}
