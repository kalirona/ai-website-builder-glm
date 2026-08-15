import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * PUT /api/admin/reset-roles — Danger Zone operation.
 *
 * Demotes every other admin on the platform to a regular user. The
 * calling admin keeps their role — this prevents a self-lockout and
 * is the only supported way to "reset" the admin list back to one.
 *
 * Returns 401 if not authenticated, 403 if not an admin.
 */
export async function PUT() {
  const admin = await requireAdmin()
  if (!admin) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorizedResponse()
    return forbiddenResponse()
  }

  const otherAdmins = await db.user.count({
    where: { role: "admin", id: { not: admin.id } },
  })

  if (otherAdmins === 0) {
    return NextResponse.json({
      ok: true,
      demoted: 0,
      message: "No other admins to demote",
    })
  }

  const result = await db.user.updateMany({
    where: { role: "admin", id: { not: admin.id } },
    data: { role: "user" },
  })

  return NextResponse.json({
    ok: true,
    demoted: result.count,
    preservedAdminId: admin.id,
  })
}
