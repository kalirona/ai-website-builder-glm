import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import type { User } from "@prisma/client"

export type SessionUser = Pick<User, "id" | "email" | "name">

/** Returns the authenticated user row, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  const id = (session?.user as { id?: string } | undefined)?.id
  if (!id) return null
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  })
  return user
}

/** Throws 401 if not authenticated. Returns the user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new UnauthorizedError()
  }
  return user
}

export class UnauthorizedError extends Error {
  status = 401
}

/** Helper to build a JSON 401 response. */
export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
