import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireAdmin, forbiddenResponse } from "@/lib/admin-guard"
import { unauthorizedResponse } from "@/lib/auth-guard"
import {
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
} from "@/lib/admin/platform-settings"

/**
 * GET /api/admin/settings — returns all platform settings as a typed object.
 *
 * Returns 401 if not authenticated, 403 if not an admin.
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorizedResponse()
    return forbiddenResponse()
  }

  const settings = await getPlatformSettings()
  return NextResponse.json(settings)
}

/**
 * PUT /api/admin/settings — bulk update platform settings.
 *
 * Body: a partial object matching PlatformSettings (camelCase field names).
 * Unknown field names are silently ignored. Type validation happens in
 * `updatePlatformSettings` — invalid values return 400 with an error.
 *
 * Returns 401 if not authenticated, 403 if not an admin.
 */
export async function PUT(req: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorizedResponse()
    return forbiddenResponse()
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length === 0
  ) {
    return NextResponse.json(
      { error: "Body must be a non-empty object of settings" },
      { status: 400 }
    )
  }

  try {
    const updated: PlatformSettings = await updatePlatformSettings(
      body as Partial<PlatformSettings>
    )
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to update platform settings",
      },
      { status: 400 }
    )
  }
}
