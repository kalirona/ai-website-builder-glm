"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MoreVertical, Pencil, Eye, Trash2, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatRelative } from "@/lib/utils"
import { toast } from "sonner"
import type { ProjectListItem } from "@/app/dashboard/page"

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ready: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  published: "bg-primary/10 text-primary",
}

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("delete failed")
      toast.success("Project deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete")
      setDeleting(false)
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
      {/* Thumbnail */}
      <Link
        href={`/editor/${project.id}`}
        className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/5 via-muted to-accent/5"
      >
        <span className="text-2xl font-bold text-muted-foreground/30">
          {project.name.slice(0, 2).toUpperCase()}
        </span>
        <Badge
          className={`absolute right-2 top-2 ${STATUS_STYLE[project.status] ?? STATUS_STYLE.draft}`}
          variant="secondary"
        >
          {project.status}
        </Badge>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/editor/${project.id}`}
            className="min-w-0 flex-1 font-semibold leading-tight hover:text-primary"
          >
            <span className="block truncate">{project.name}</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/editor/${project.id}`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/preview/${project.id}`} target="_blank">
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground/60">
            {project.businessType || "No description"}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {formatRelative(project.updatedAt)}
          </span>
          <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
            <Link href={`/editor/${project.id}`}>Open editor</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
