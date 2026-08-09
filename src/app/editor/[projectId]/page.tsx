import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { EditorShell, type PageSummary } from "@/components/editor/editor-shell"
import { safeParse } from "@/lib/utils"
import { createBlankEditorData } from "@/lib/editor/node-ops"
import { defaultDesignTokens } from "@/lib/editor/types"
import type { DesignTokens, EditorData } from "@/lib/editor/types"

export const dynamic = "force-dynamic"

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const userId = (session.user as { id?: string }).id!

  const { projectId } = await params

  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { website: { include: { pages: { select: { id: true, name: true, slug: true } } } } },
  })
  if (!project) notFound()

  // Ensure a website + home page exist.
  let website = project.website
  if (!website) {
    website = await db.website.create({
      data: {
        projectId: project.id,
        name: project.name,
        globalStyles: JSON.stringify(defaultDesignTokens),
        navigation: JSON.stringify([]),
        pages: {
          create: {
            name: "Home",
            slug: "home",
            title: project.name,
            editorData: JSON.stringify(createBlankEditorData()),
          },
        },
      },
      include: { pages: { select: { id: true, name: true, slug: true } } },
    })
  }

  const pages: PageSummary[] = (website.pages ?? []).map((p) => ({
    slug: p.slug,
    name: p.name,
  }))

  // make sure there's at least a home page
  if (pages.length === 0) {
    const p = await db.page.create({
      data: {
        websiteId: website.id,
        name: "Home",
        slug: "home",
        title: project.name,
        editorData: JSON.stringify(createBlankEditorData()),
      },
    })
    pages.push({ slug: p.slug, name: p.name })
  }

  const homePage =
    (await db.page.findUnique({
      where: { websiteId_slug: { websiteId: website.id, slug: "home" } },
    })) ?? website.pages?.find((p) => p.slug === "home")

  const editorData = homePage
    ? safeParse<EditorData>(homePage.editorData, createBlankEditorData())
    : createBlankEditorData()

  const tokens = safeParse<DesignTokens>(website.globalStyles, defaultDesignTokens)

  return (
    <EditorShell
      projectId={project.id}
      projectName={project.name}
      pages={pages}
      initialPageSlug="home"
      initialEditorData={editorData}
      initialTokens={tokens}
    />
  )
}
