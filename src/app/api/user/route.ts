import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"

/**
 * GET /api/user — return the currently authenticated user's profile.
 * Used by the Settings page.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ user })
}

/**
 * PATCH /api/user — update the current user's profile.
 * Currently supports: name. Email is intentionally not editable here.
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") {
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 })
    }
    data.name = trimmed
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true },
  })
  return NextResponse.json({ user: updated })
}
