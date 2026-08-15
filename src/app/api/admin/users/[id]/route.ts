import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * DELETE /api/admin/users/[id]
 *
 * - Only admins can call this.
 * - Cannot delete yourself.
 * - Cascade is handled at the Prisma schema level (Project.owner onDelete:
 *   Cascade → Website.project onDelete: Cascade → Page.website onDelete:
 *   Cascade), so deleting the User row removes all their projects, websites,
 *   and pages automatically.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorizedResponse()
    return forbiddenResponse()
  }

  const { id } = await params

  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    )
  }

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await db.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
