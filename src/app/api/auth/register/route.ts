import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/password"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = (body.email as string | undefined)?.trim().toLowerCase()
    const password = body.password as string | undefined
    const name = (body.name as string | undefined)?.trim() || undefined

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
