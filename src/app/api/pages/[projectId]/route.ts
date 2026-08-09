import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"
import { safeParse } from "@/lib/utils"
import { defaultDesignTokens } from "@/lib/editor/types"
import type { DesignTokens, EditorData } from "@/lib/editor/types"
import { validateEditorData, createBlankEditorData } from "@/lib/editor/node-ops"

async function getOwnedPage(userId: string, projectId: string, slug: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  })
  if (!project) return null
  const website = await db.website.findUnique({ where: { projectId } })
  if (!website) return null
  return { website, page: await db.page.findUnique({ where: { websiteId_slug: { websiteId: website.id, slug } } }) }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectId } = await params
  const url = new URL(_req.url)
  const slug = url.searchParams.get("slug") || "home"

  const res = await getOwnedPage(user.id, projectId, slug)
  if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { website, page } = res
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })

  const editorData = safeParse<EditorData>(page.editorData, createBlankEditorData())
  const designTokens = safeParse<DesignTokens>(website.globalStyles, defaultDesignTokens)

  return NextResponse.json({
    page: {
      id: page.id,
      name: page.name,
      slug: page.slug,
      title: page.title,
      description: page.description,
      status: page.status,
    },
    editorData,
    designTokens,
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectId } = await params
  const url = new URL(req.url)
  const slug = url.searchParams.get("slug") || "home"

  const res = await getOwnedPage(user.id, projectId, slug)
  if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { page } = res
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })

  const body = await req.json()
  if (!body.editorData) {
    return NextResponse.json({ error: "editorData is required" }, { status: 400 })
  }
  if (!validateEditorData(body.editorData)) {
    return NextResponse.json({ error: "Invalid editorData" }, { status: 400 })
  }

  await db.page.update({
    where: { id: page.id },
    data: { editorData: JSON.stringify(body.editorData) },
  })

  return NextResponse.json({ ok: true })
}
