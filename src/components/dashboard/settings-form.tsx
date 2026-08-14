"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export function SettingsForm({
  initialName,
  email,
}: {
  initialName: string
  email: string
}) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dirty = name.trim() !== initialName && name.trim().length > 0

  const handleSave = async () => {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to save")
        return
      }
      toast.success("Profile updated")
      // Reload to refresh the session cookie's name (JWTStrategy session).
      window.location.reload()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      // Note: this is MVP — there is no DELETE /api/user endpoint, so we just
      // sign the user out. A real implementation would call DELETE /api/user
      // (which cascades through Project → Website → Page on the Prisma side).
      await signOut({ callbackUrl: "/" })
      toast.success("Account deletion requested")
    } catch {
      toast.error("Something went wrong")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your display name. Email cannot be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="max-w-md bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Email changes are not supported yet.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setName(initialName)}
            disabled={!dirty || saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </CardFooter>
      </Card>

      {/* Brand defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Brand defaults</CardTitle>
          <CardDescription>
            Default design tokens applied to new websites generated from your
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Default primary color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value="#4f46e5"
                  disabled
                  className="h-9 w-12 cursor-not-allowed rounded border border-input bg-transparent p-0.5 opacity-60"
                />
                <Input value="#4f46e5" disabled className="bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default secondary color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value="#0ea5e9"
                  disabled
                  className="h-9 w-12 cursor-not-allowed rounded border border-input bg-transparent p-0.5 opacity-60"
                />
                <Input value="#0ea5e9" disabled className="bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default radius</Label>
              <Input value="12px" disabled className="bg-muted/50" />
            </div>
          </div>
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            Per-account brand defaults are coming soon. For now, every new
            website starts with the global Webcraft design tokens and you can
            customize tokens per-website in the editor.
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all of your websites. This
            action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will sign you out and mark your account for deletion.
                  All projects, websites and pages associated with your
                  account will be removed. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Delete account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  )
}
