"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Wand2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const BUSINESS_TYPES = [
  "Digital Marketing Agency",
  "SaaS / Software",
  "Restaurant / Cafe",
  "Local Business",
  "Consultant",
  "Freelancer",
  "E-commerce / Retail",
  "Real Estate",
  "Dental / Medical",
  "Coach / Course Creator",
  "Portfolio",
  "Other",
]

const STYLES = ["Modern", "Minimal", "Bold", "Elegant", "Playful", "Corporate"]
const GOALS = [
  "Generate leads",
  "Sell products",
  "Book appointments",
  "Build brand",
  "Get signups",
]

export function CreateWebsiteDialog({
  children,
}: {
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    businessName: "",
    businessType: "Digital Marketing Agency",
    targetAudience: "",
    services: "",
    location: "",
    stylePreference: "Modern",
    primaryGoal: "Generate leads",
  })

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessName.trim()) {
      toast.error("Please enter a business name")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.businessName,
          businessType: form.businessType,
          generate: form,
        }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 201) {
        toast.error(data.error || "Failed to create website")
        setLoading(false)
        return
      }
      if (data.warning) {
        toast.error(`Generation issue: ${data.warning}. You can edit manually.`)
      } else {
        toast.success("Website generated!")
      }
      setOpen(false)
      router.push(`/editor/${data.id}`)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Wand2 className="mr-2 h-4 w-4" />
            Create Website
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a new website</DialogTitle>
          <DialogDescription>
            Tell us about your business and our AI will generate a complete
            website you can edit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name *</Label>
            <Input
              id="businessName"
              required
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="e.g. Preet Web Vision"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Business type</Label>
              <Select
                value={form.businessType}
                onValueChange={(v) => set("businessType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Style</Label>
              <Select
                value={form.stylePreference}
                onValueChange={(v) => set("stylePreference", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="services">Services / Products</Label>
            <Textarea
              id="services"
              value={form.services}
              onChange={(e) => set("services", e.target.value)}
              placeholder="e.g. SEO, Web Design, Google Ads"
              className="min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="targetAudience">Target audience</Label>
              <Input
                id="targetAudience"
                value={form.targetAudience}
                onChange={(e) => set("targetAudience", e.target.value)}
                placeholder="e.g. Small businesses"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. New York, USA"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Primary goal</Label>
            <Select
              value={form.primaryGoal}
              onValueChange={(v) => set("primaryGoal", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOALS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Website
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
