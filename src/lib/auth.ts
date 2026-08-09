import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/password"

export const authOptions: NextAuthOptions = {
  // JWT sessions (stateless) — no DB session store needed.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  // NOTE: behind the gateway (Caddy), NextAuth v4 must trust the forwarded
  // Host / X-Forwarded-Proto headers so it derives the correct public URL
  // (https://preview-chat-*.space-z.ai) instead of localhost:3000. This is
  // enabled via the AUTH_TRUST_HOST env var (see .env), NOT the `trustHost`
  // option (that's NextAuth v5). Without it, the session cookie + callback
  // redirect use localhost and the browser hits "redirected you too many
  // times" through the proxy.
  //
  // When AUTH_TRUST_HOST + HTTPS are detected, NextAuth auto-switches to
  // __Host-/__Secure- prefixed cookies with the Secure flag. Those are
  // stricter and can fail through some proxy setups, so we explicitly pin
  // the standard cookie names (no prefix) with SameSite=Lax. The Secure flag
  // is still set automatically when the request is HTTPS (via X-Forwarded-Proto).
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.trim().toLowerCase()
        const user = await db.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null
        const ok = await verifyPassword(credentials.password, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name ?? undefined }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        ;(session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
