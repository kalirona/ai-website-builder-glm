import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * DELETE /api/admin/projects/[id]
 *
 * Admin override — deletes any project regardless of owner.
 * Cascade (Project → Website → Page) is handled at the schema level.
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

  const project = await db.project.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  await db.project.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
