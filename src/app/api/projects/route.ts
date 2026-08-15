import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"
import { slugify, safeParse } from "@/lib/utils"
import { createBlankEditorData } from "@/lib/editor/node-ops"
import { defaultDesignTokens } from "@/lib/editor/types"
import { getAIProvider } from "@/lib/ai/provider-resolver"
import type { GenerateWebsiteInput } from "@/lib/ai/schemas"
import type { DesignTokens } from "@/lib/editor/types"

function uniqueSlug(base: string, existing: string[]): string {
  let slug = slugify(base) || "project"
  let i = 2
  while (existing.includes(slug)) {
    slug = `${slugify(base)}-${i}`
    i++
  }
  return slug
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projects = await db.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { website: { select: { id: true } } },
  })

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      businessType: p.businessType,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      hasWebsite: !!p.website,
    })),
  })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const name = (body.name as string | undefined)?.trim()
    const description = (body.description as string | undefined)?.trim() || null
    const businessType = (body.businessType as string | undefined)?.trim() || null
    const generate = body.generate as Partial<GenerateWebsiteInput> | undefined

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const existingSlugs = (
      await db.project.findMany({ where: { ownerId: user.id }, select: { slug: true } })
    ).map((p) => p.slug)
    const slug = uniqueSlug(name, existingSlugs)

    // Create project + website + empty home page.
    const project = await db.project.create({
      data: {
        ownerId: user.id,
        name,
        slug,
        description,
        businessType,
        status: generate?.businessName ? "generating" : "draft",
        website: {
          create: {
            name,
            globalStyles: JSON.stringify(defaultDesignTokens),
            navigation: JSON.stringify([]),
          },
        },
      },
      include: { website: true },
    })

    const website = project.website!
    // create a blank home page
    const blank = createBlankEditorData()
    await db.page.create({
      data: {
        websiteId: website.id,
        name: "Home",
        slug: "home",
        title: name,
        editorData: JSON.stringify(blank),
      },
    })

    // If generation inputs were provided, run AI generation.
    if (generate?.businessName && generate?.businessType) {
      try {
        const result = await (await getAIProvider()).generateWebsite({
          businessName: generate.businessName,
          businessType: generate.businessType,
          targetAudience: generate.targetAudience,
          services: generate.services,
          location: generate.location,
          stylePreference: generate.stylePreference,
          primaryGoal: generate.primaryGoal,
        })

        const tokens: DesignTokens = {
          ...defaultDesignTokens,
          ...result.designTokens,
        }

        // Update website tokens + navigation + name
        await db.website.update({
          where: { projectId: project.id },
          data: {
            name: result.websiteName,
            globalStyles: JSON.stringify(tokens),
            navigation: JSON.stringify(result.navigation),
          },
        })

        // Update / create pages from the generated result.
        for (const page of result.pages) {
          const existing = await db.page.findUnique({
            where: { websiteId_slug: { websiteId: website.id, slug: page.slug } },
          })
          const editorData = JSON.stringify(page.editorData)
          if (existing) {
            await db.page.update({
              where: { id: existing.id },
              data: {
                name: page.name,
                title: page.title ?? null,
                description: page.description ?? null,
                editorData,
              },
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

        await db.project.update({
          where: { id: project.id },
          data: { status: "ready" },
        })
      } catch (err) {
        // generation failed — keep the blank page but mark status
        await db.project.update({
          where: { id: project.id },
          data: { status: "draft" },
        })
        const message = err instanceof Error ? err.message : "AI generation failed"
        return NextResponse.json(
          { id: project.id, warning: message },
          { status: 201 }
        )
      }
    }

    return NextResponse.json({ id: project.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create project"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// keep import used
void safeParse
