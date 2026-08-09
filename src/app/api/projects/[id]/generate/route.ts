import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"
import { aiProvider } from "@/lib/ai/zai-provider"
import { defaultDesignTokens } from "@/lib/editor/types"
import type { DesignTokens } from "@/lib/editor/types"
import type { GenerateWebsiteInput } from "@/lib/ai/schemas"

/** POST /api/projects/[id]/generate — regenerate the website via AI. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const project = await db.project.findFirst({ where: { id, ownerId: user.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = (await req.json()) as Partial<GenerateWebsiteInput>
  if (!body.businessName || !body.businessType) {
    return NextResponse.json(
      { error: "businessName and businessType are required" },
      { status: 400 }
    )
  }

  await db.project.update({ where: { id }, data: { status: "generating" } })

  try {
    const result = await aiProvider.generateWebsite({
      businessName: body.businessName,
      businessType: body.businessType,
      targetAudience: body.targetAudience,
      services: body.services,
      location: body.location,
      stylePreference: body.stylePreference,
      primaryGoal: body.primaryGoal,
    })

    const tokens: DesignTokens = { ...defaultDesignTokens, ...result.designTokens }
    const website = await db.website.findUnique({ where: { projectId: id } })

    if (website) {
      await db.website.update({
        where: { projectId: id },
        data: {
          name: result.websiteName,
          globalStyles: JSON.stringify(tokens),
          navigation: JSON.stringify(result.navigation),
        },
      })

      for (const page of result.pages) {
        const existing = await db.page.findUnique({
          where: { websiteId_slug: { websiteId: website.id, slug: page.slug } },
        })
        const editorData = JSON.stringify(page.editorData)
        if (existing) {
          await db.page.update({
            where: { id: existing.id },
            data: { name: page.name, title: page.title ?? null, description: page.description ?? null, editorData },
          })
        } else {
          await db.page.create({
            data: {
              websiteId: website.id,
              name: page.name,
              slug: page.slug,
              title: page.title ?? null,
              description: page.description ?? null,
              editorData,
            },
          })
        }
      }
    }

    await db.project.update({ where: { id }, data: { status: "ready" } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    await db.project.update({ where: { id }, data: { status: "draft" } })
    const message = err instanceof Error ? err.message : "AI generation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
