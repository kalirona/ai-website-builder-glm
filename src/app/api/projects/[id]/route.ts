import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-guard"

async function getOwnedProject(userId: string, id: string) {
  return db.project.findFirst({ where: { id, ownerId: userId } })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const project = await getOwnedProject(user.id, id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ project })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const project = await getOwnedProject(user.id, id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") data.name = body.name.trim()
  if (typeof body.description === "string") data.description = body.description.trim()
  if (typeof body.businessType === "string") data.businessType = body.businessType.trim()
  if (typeof body.status === "string") data.status = body.status

  const updated = await db.project.update({ where: { id }, data })
  return NextResponse.json({ project: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const project = await getOwnedProject(user.id, id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await db.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
