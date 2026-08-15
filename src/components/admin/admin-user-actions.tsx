"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, ShieldOff, Trash2, Loader2 } from "lucide-react"
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

export interface AdminUserActionProps {
  userId: string
  currentRole: string
  userEmail: string
  /** Whether this row is the currently-logged-in admin (self). */
  isSelf: boolean
}

/**
 * Per-row admin actions for the users table:
 *  - Toggle role (Make Admin / Remove Admin)
 *  - Delete user (with confirmation dialog)
 *
 * Self-actions are disabled: you cannot demote or delete yourself.
 */
export function AdminUserActions({
  userId,
  currentRole,
  userEmail,
  isSelf,
}: AdminUserActionProps) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = currentRole === "admin"
  const nextRole = isAdmin ? "user" : "admin"

  const handleToggleRole = async () => {
    setToggling(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role")
      }
      toast.success(
        nextRole === "admin"
          ? "User promoted to admin"
          : "Admin privileges removed"
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role")
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user")
      }
      toast.success("User deleted")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant={isAdmin ? "outline" : "secondary"}
        disabled={isSelf || toggling || deleting}
        onClick={handleToggleRole}
        title={
          isSelf ? "You cannot change your own role" : "Toggle admin role"
        }
      >
        {toggling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isAdmin ? (
          <ShieldOff className="h-3.5 w-3.5" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        {isAdmin ? "Remove Admin" : "Make Admin"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            disabled={isSelf || toggling || deleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            title={isSelf ? "You cannot delete your own account" : "Delete user"}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Delete user</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{userEmail}</span>{" "}
              and cascade-remove all of their projects, websites, and pages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete user"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
