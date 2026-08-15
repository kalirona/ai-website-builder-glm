import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * DELETE /api/admin/projects-all — Danger Zone operation.
 *
 * Deletes ALL projects (and their cascaded websites + pages) on the
 * platform EXCEPT those owned by the calling admin. The admin's own
 * projects are preserved so the bootstrap admin doesn't accidentally
 * wipe the demo content under their own account.
 *
 * Returns 401 if not authenticated, 403 if not an admin.
 */
export async function DELETE() {
  const admin = await requireAdmin()
  if (!admin) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorizedResponse()
    return forbiddenResponse()
  }

  // Count first so we can report a useful number to the UI.
  const totalProjects = await db.project.count()
  const adminProjects = await db.project.count({
    where: { ownerId: admin.id },
  })
  const toDelete = Math.max(0, totalProjects - adminProjects)

  if (toDelete === 0) {
    return NextResponse.json({ ok: true, deleted: 0, message: "No projects to delete" })
  }

  // Cascade (Project → Website → Page) is enforced at the schema level,
  // so deleting the projects is enough — their websites and pages go too.
  const result = await db.project.deleteMany({
    where: { ownerId: { not: admin.id } },
  })

  return NextResponse.json({
    ok: true,
    deleted: result.count,
    preserved: adminProjects,
  })
}
