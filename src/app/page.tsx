import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AppLogo } from "@/components/shared/app-logo"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  MousePointerClick,
  Smartphone,
  Wand2,
  Layers,
  Rocket,
  Check,
} from "lucide-react"

export default async function LandingPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <AppLogo />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered website builder
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Describe your business.
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Get a professional website.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                Webcraft turns a few details about your business into a complete,
                editable website. Tweak every section visually — no code, no
                templates to wrestle with.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild className="h-12 px-8">
                  <Link href="/register">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Build your website
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 px-8">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Free to start · No credit card required
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need to launch
              </h2>
              <p className="mt-3 text-muted-foreground">
                A real visual editor, not just an AI landing page generator.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border bg-card p-6 transition hover:shadow-md"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t">
          <div className="mx-auto max-w-4xl px-4 py-20">
            <h2 className="text-center text-3xl font-bold tracking-tight">
              How it works
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to build your website?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              Join thousands of business owners creating beautiful websites with
              AI.
            </p>
            <Button size="lg" variant="secondary" asChild className="mt-6 h-12 px-8">
              <Link href="/register">Get started for free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8 text-sm text-muted-foreground">
          <AppLogo size="sm" />
          <p>© {new Date().getFullYear()} Webcraft. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  {
    icon: Wand2,
    title: "AI website generation",
    desc: "Describe your business and get a complete, structured website in seconds — with real copy, not placeholders.",
  },
  {
    icon: MousePointerClick,
    title: "Visual editing",
    desc: "Click any section to edit it. Drag, drop, duplicate, and undo with a professional editor built for non-developers.",
  },
  {
    icon: Smartphone,
    title: "Responsive by design",
    desc: "Switch between desktop, tablet, and mobile. Every section adapts, and you can fine-tune each breakpoint.",
  },
  {
    icon: Layers,
    title: "Structured, not fragile",
    desc: "Your site is built from a clean component schema — AI edits stay safe and predictable, never raw HTML.",
  },
  {
    icon: Sparkles,
    title: "Section-level AI edits",
    desc: "Ask the AI to improve a single section without regenerating the whole page. (Coming next.)",
  },
  {
    icon: Rocket,
    title: "Publish in one click",
    desc: "Preview your site, then publish when you're ready. The published site renders from the same schema.",
  },
]

const STEPS = [
  {
    title: "Describe your business",
    desc: "Enter your business name, type, services, and goals.",
  },
  {
    title: "AI builds your site",
    desc: "Get a full website with hero, features, testimonials, and more.",
  },
  {
    title: "Edit and publish",
    desc: "Tweak anything visually, then publish with one click.",
  },
]
