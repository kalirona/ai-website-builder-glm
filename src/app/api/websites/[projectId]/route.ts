import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"
import { safeParse } from "@/lib/utils"
import { defaultDesignTokens } from "@/lib/editor/types"
import type { DesignTokens } from "@/lib/editor/types"

async function getOwnedWebsite(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  })
  if (!project) return null
  return db.website.findUnique({
    where: { projectId },
    include: { pages: { select: { id: true, name: true, slug: true } } },
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectId } = await params
  const website = await getOwnedWebsite(user.id, projectId)
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const tokens = safeParse<DesignTokens>(website.globalStyles, defaultDesignTokens)
  const navigation = safeParse<{ label: string; url: string }[]>(website.navigation, [])
  return NextResponse.json({
    website: {
      id: website.id,
      name: website.name,
      domain: website.domain,
      logo: website.logo,
      favicon: website.favicon,
      theme: website.theme,
      designTokens: tokens,
      navigation,
      pages: website.pages,
    },
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectId } = await params
  const website = await getOwnedWebsite(user.id, projectId)
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.domain === "string") data.domain = body.domain
  if (typeof body.logo === "string") data.logo = body.logo
  if (typeof body.favicon === "string") data.favicon = body.favicon
  if (typeof body.theme === "string") data.theme = body.theme
  if (body.globalStyles && typeof body.globalStyles === "object") {
    data.globalStyles = JSON.stringify(body.globalStyles)
  }
  if (body.navigation && Array.isArray(body.navigation)) {
    data.navigation = JSON.stringify(body.navigation)
  }

  await db.website.update({ where: { projectId }, data })
  return NextResponse.json({ ok: true })
}
