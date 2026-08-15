import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"
import { forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"

/**
 * POST /api/admin/bootstrap
 *
 * If NO admins exist in the database yet, promote the currently authenticated
 * user to admin. This lets the first user become admin without manual DB
 * edits.
 *
 * If any admin already exists, returns 403 (forbidden) — bootstrap is a
 * one-shot operation per deployment.
 */
export async function POST() {
  // Must be authenticated first.
  const currentUser = await getCurrentUser()
  if (!currentUser) return unauthorizedResponse()

  // Check if any admin already exists.
  const adminCount = await db.user.count({ where: { role: "admin" } })
  if (adminCount > 0) {
    return forbiddenResponse()
  }

  // Promote the current user.
  const updated = await db.user.update({
    where: { id: currentUser.id },
    data: { role: "admin" },
    select: { id: true, email: true, name: true, role: true },
  })

  // Note: the role on the user's existing JWT won't update immediately
  // (NextAuth JWT is stateless), but `requireAdmin` always re-checks the DB,
  // so the newly-promoted admin can call admin endpoints right away. The
  // session callback will pick up the new role on the next token refresh.

  return NextResponse.json({ user: updated, bootstrapped: true })
}
