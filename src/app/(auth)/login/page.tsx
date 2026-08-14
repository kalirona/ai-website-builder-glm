import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

/**
 * Login page (server component).
 *
 * The login form uses `useSearchParams()` which Next.js requires to be wrapped
 * in a <Suspense> boundary during static prerendering. This page is the thin
 * server wrapper; the actual form lives in <LoginForm />.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
