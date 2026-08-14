import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"
import { safeParse, slugify } from "@/lib/utils"
import { defaultDesignTokens } from "@/lib/editor/types"
import type { DesignTokens, EditorData } from "@/lib/editor/types"
import { validateEditorData, createBlankEditorData } from "@/lib/editor/node-ops"

async function getOwnedWebsite(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  })
  if (!project) return null
  return db.website.findUnique({ where: { projectId } })
}

async function getOwnedPage(userId: string, projectId: string, slug: string) {
  const website = await getOwnedWebsite(userId, projectId)
  if (!website) return null
  return {
    website,
    page: await db.page.findUnique({ where: { websiteId_slug: { websiteId: website.id, slug } } }),
  }
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

/**
 * Create a new blank page on this website.
 * Body: { name: string, slug?: string }
 * Slug is auto-derived from name if not supplied. Rejects duplicate slugs.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectId } = await params

  const website = await getOwnedWebsite(user.id, projectId)
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: { name?: unknown; slug?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  const rawSlug = typeof body.slug === "string" && body.slug.trim() ? body.slug : name
  const slug = slugify(rawSlug)
  if (!slug) {
    return NextResponse.json({ error: "Could not derive a valid slug" }, { status: 400 })
  }

  // Reject duplicate slugs on the same website.
  const existing = await db.page.findUnique({
    where: { websiteId_slug: { websiteId: website.id, slug } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: `A page with slug "${slug}" already exists` },
      { status: 409 }
    )
  }

  const page = await db.page.create({
    data: {
      websiteId: website.id,
      name,
      slug,
      title: name,
      editorData: JSON.stringify(createBlankEditorData()),
    },
    select: { id: true, name: true, slug: true },
  })

  return NextResponse.json({ page }, { status: 201 })
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
