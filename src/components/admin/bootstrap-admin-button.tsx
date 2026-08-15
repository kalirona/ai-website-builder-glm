"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

/**
 * One-shot "become the first admin" button. Calls POST /api/admin/bootstrap.
 *
 * The server returns 403 if any admin already exists, so this component is
 * safe to render even after the first admin has been promoted — but it
 * should only be shown when no admin exists (the page decides that).
 */
export function BootstrapAdminButton({
  userEmail,
}: {
  userEmail: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleBootstrap = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/bootstrap", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Bootstrap failed")
      }
      toast.success("You are now an admin")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bootstrap failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Become the first Super Admin
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Promote yourself to admin?</AlertDialogTitle>
          <AlertDialogDescription>
            No admins exist yet. You can promote{" "}
            <span className="font-medium text-foreground">{userEmail}</span> to
            the <span className="font-medium text-foreground">admin</span> role.
            This is a one-shot operation — once an admin exists, the bootstrap
            endpoint is permanently disabled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBootstrap}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Promoting…
              </>
            ) : (
              "Promote me to admin"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
