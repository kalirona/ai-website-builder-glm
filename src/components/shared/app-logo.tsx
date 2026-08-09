import Link from "next/link"
import { cn } from "@/lib/utils"

export function AppLogo({
  className,
  href = "/",
  size = "md",
}: {
  className?: string
  href?: string
  size?: "sm" | "md"
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8"
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          dim
        )}
      >
        <span className="text-sm font-bold">W</span>
      </span>
      <span className="text-base font-semibold tracking-tight">Webcraft</span>
    </Link>
  )
}
