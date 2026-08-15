import { getCurrentUser, type SessionUser } from "./auth-guard"
import { db } from "./db"

/**
 * Returns the current user if (and only if) they have the `admin` role.
 * Returns `null` if:
 *   - not authenticated, OR
 *   - authenticated but not an admin.
 *
 * Always re-checks the database (never trusts the JWT role alone) so that
 * demoting an admin takes effect on the next request even if their JWT is
 * still in flight.
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (fullUser?.role !== "admin") return null
  return user
}

/** Helper to build a JSON 403 response. */
export function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 })
}
