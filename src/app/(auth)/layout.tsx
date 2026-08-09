import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * Server layout for the (auth) route group (login + register).
 *
 * Authenticated users are redirected away to the dashboard BEFORE the client
 * page even mounts. This eliminates the post-signin redirect loop that
 * occurred when the session cookie hadn't propagated to the first
 * server render of /dashboard (which then bounced back to /login, which
 * re-rendered, etc.).
 *
 * Unauthenticated users see the auth page normally.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")
  return <>{children}</>
}
