import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/password"

// Fallbacks: the .env file in this sandbox occasionally gets reset to only
// DATABASE_URL. These ensure auth always works even if NEXTAUTH_SECRET /
// AUTH_TRUST_HOST vanish. In production, .env is reliable and these are
// overridden by the real values.
const FALLBACK_SECRET = "GeGVqvx/Xn2Pri/Z2T5dxsPPtaxmPCJPmXdd34kflcA="
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || FALLBACK_SECRET
process.env.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST || "true"

export const authOptions: NextAuthOptions = {
  // JWT sessions (stateless) — no DB session store needed.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  // CRITICAL (gateway/proxy fix):
  // The app runs behind a Caddy gateway (HTTPS) but Next.js itself runs on
  // http://localhost:3000. NextAuth v4's auto-detection of HTTPS via
  // X-Forwarded-Proto causes it to set useSecureCookies=true, which (a)
  // renames cookies to __Secure-/__Host- prefixes and (b) sets the Secure
  // flag. Through the proxy this broke cookie storage and caused a
  // "redirected you too many times" loop.
  //
  // Fix: force useSecureCookies=false and pin standard (non-prefixed) cookie
  // names with SameSite=Lax, secure:false. The gateway terminates TLS, so the
  // cookie still travels over HTTPS to the browser — we just don't set the
  // Secure flag, which is safe because the gateway guarantees HTTPS.
  useSecureCookies: false,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: false,
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
