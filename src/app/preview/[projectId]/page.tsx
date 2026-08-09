import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { PreviewRenderer } from "@/components/editor/preview-renderer"
import { safeParse } from "@/lib/utils"
import { createBlankEditorData } from "@/lib/editor/node-ops"
import { defaultDesignTokens } from "@/lib/editor/types"
import type { DesignTokens, EditorData } from "@/lib/editor/types"

export const dynamic = "force-dynamic"

export default async function PreviewPage({
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
    include: { website: true },
  })
  if (!project) notFound()

  if (!project.website) {
    return (
      <PreviewRenderer
        editorData={createBlankEditorData()}
        designTokens={defaultDesignTokens}
        projectName={project.name}
      />
    )
  }

  const homePage = await db.page.findUnique({
    where: { websiteId_slug: { websiteId: project.website.id, slug: "home" } },
  })

  const editorData = homePage
    ? safeParse<EditorData>(homePage.editorData, createBlankEditorData())
    : createBlankEditorData()
  const tokens = safeParse<DesignTokens>(
    project.website.globalStyles,
    defaultDesignTokens
  )

  return (
    <PreviewRenderer
      editorData={editorData}
      designTokens={tokens}
      projectName={project.name}
    />
  )
}
