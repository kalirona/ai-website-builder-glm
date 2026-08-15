import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * PATCH /api/admin/users/[id]/role
 * Body: { role: "user" | "admin" }
 *
 * - Only admins can call this.
 * - Cannot change your own role (prevents self-demotion lockout and
 *   accidental self-promotion exploits via this endpoint — admins are
 *   bootstrapped via /api/admin/bootstrap).
 */
export async function PATCH(
  req: Request,
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
      { error: "You cannot change your own role." },
      { status: 400 }
    )
  }

  let body: { role?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const role = body.role
  if (role !== "user" && role !== "admin") {
    return NextResponse.json(
      { error: "role must be 'user' or 'admin'" },
      { status: 400 }
    )
  }

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const updated = await db.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  })

  return NextResponse.json({ user: updated })
}
