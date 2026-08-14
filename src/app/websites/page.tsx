import { redirect } from "next/navigation"

/**
 * /websites — alias for /dashboard for now. The dashboard sidebar links here
 * as a distinct top-level nav item; once a dedicated websites list view is
 * built out (filters, sorting, etc.), this route will host it.
 */
export default function WebsitesPage() {
  redirect("/dashboard")
}
