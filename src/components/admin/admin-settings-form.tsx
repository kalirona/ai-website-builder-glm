"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Trash2,
  ShieldOff,
  Cpu,
  Palette,
  Flag,
  Settings as SettingsIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
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

/** Settings shape returned by GET /api/admin/settings. */
interface PlatformSettings {
  platformName: string
  platformSupportEmail: string
  platformMaxProjectsPerUser: number
  platformAiGenerationEnabled: boolean
  platformRegistrationEnabled: boolean

  featureSectionAiEditing: boolean
  featureAiWebsiteGeneration: boolean
  featureVisualEditor: boolean
  featureCustomDomains: boolean
  featurePublishing: boolean

  designPrimaryColor: string
  designSecondaryColor: string
  designAccentColor: string
  designBorderRadius: string
}

interface AiInfo {
  provider: "openrouter" | "zai"
  model: string
}

const DEFAULTS: PlatformSettings = {
  platformName: "Webcraft",
  platformSupportEmail: "support@webcraft.app",
  platformMaxProjectsPerUser: 10,
  platformAiGenerationEnabled: true,
  platformRegistrationEnabled: true,

  featureSectionAiEditing: true,
  featureAiWebsiteGeneration: true,
  featureVisualEditor: true,
  featureCustomDomains: false,
  featurePublishing: true,

  designPrimaryColor: "#4f46e5",
  designSecondaryColor: "#0ea5e9",
  designAccentColor: "#f59e0b",
  designBorderRadius: "12px",
}

const RADIUS_PRESETS = ["0px", "4px", "8px", "12px", "16px", "24px"]

/**
 * AdminSettingsForm — client component that fetches, renders, and saves
 * all platform-wide settings.
 *
 * Sections:
 *  A. Platform Configuration (text + number inputs + toggles)
 *  B. AI Provider Configuration (read-only display from /api/ai-info)
 *  C. Default Design Tokens (color pickers + radius select)
 *  D. Feature Flags (toggles)
 *  E. Danger Zone (delete all projects / reset all admin roles)
 */
export function AdminSettingsForm() {
  const router = useRouter()

  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS)
  const [aiInfo, setAiInfo] = useState<AiInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Danger zone
  const [deletingProjects, setDeletingProjects] = useState(false)
  const [resettingRoles, setResettingRoles] = useState(false)

  // ---------- load ----------
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, aiRes] = await Promise.all([
        fetch("/api/admin/settings", { cache: "no-store" }),
        fetch("/api/ai-info", { cache: "no-store" }),
      ])

      if (settingsRes.status === 401) {
        router.push("/login")
        return
      }
      if (settingsRes.status === 403) {
        toast.error("You are not authorized to view platform settings.")
        router.push("/dashboard")
        return
      }
      if (!settingsRes.ok) {
        throw new Error("Failed to load platform settings")
      }

      const data = (await settingsRes.json()) as PlatformSettings
      setSettings({ ...DEFAULTS, ...data })
      setDirty(false)

      // AI info is non-fatal if it fails.
      if (aiRes.ok) {
        setAiInfo((await aiRes.json()) as AiInfo)
      } else {
        setAiInfo(null)
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load settings"
      )
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // ---------- field updates ----------
  const updateField = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  // ---------- save ----------
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings")
      }
      setSettings({ ...DEFAULTS, ...(data as PlatformSettings) })
      setDirty(false)
      toast.success("Platform settings saved")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings"
      )
    } finally {
      setSaving(false)
    }
  }

  // ---------- danger zone ----------
  const handleDeleteAllProjects = async () => {
    setDeletingProjects(true)
    try {
      const res = await fetch("/api/admin/projects-all", {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete projects")
      }
      toast.success(
        `Deleted ${data.deleted ?? 0} project(s). Your projects were preserved.`
      )
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete projects"
      )
    } finally {
      setDeletingProjects(false)
    }
  }

  const handleResetRoles = async () => {
    setResettingRoles(true)
    try {
      const res = await fetch("/api/admin/reset-roles", {
        method: "PUT",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset roles")
      }
      toast.success(
        `Demoted ${data.demoted ?? 0} admin(s) to regular users. You remain an admin.`
      )
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset roles"
      )
    } finally {
      setResettingRoles(false)
    }
  }

  // ---------- render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading platform settings…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sticky save bar */}
      <div className="sticky top-16 z-30 -mx-4 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:mx-0 md:rounded-lg md:border">
        <div className="flex items-center gap-2 text-sm">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Platform Settings</span>
          {dirty ? (
            <Badge variant="secondary" className="ml-2 text-[11px]">
              Unsaved changes
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadAll()}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4" />
            Revert
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </div>

      {/* A. Platform Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            Platform Configuration
          </CardTitle>
          <CardDescription>
            Core platform metadata + access controls. These values are used
            across the application (e.g. emails, registration, default
            project limits).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) =>
                  updateField("platformName", e.target.value)
                }
                placeholder="Webcraft"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                Shown in the header, emails, and the document title.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformSupportEmail">Support email</Label>
              <Input
                id="platformSupportEmail"
                type="email"
                value={settings.platformSupportEmail}
                onChange={(e) =>
                  updateField("platformSupportEmail", e.target.value)
                }
                placeholder="support@webcraft.app"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Displayed to users for support contact.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxProjectsPerUser">
                Maximum projects per user
              </Label>
              <Input
                id="maxProjectsPerUser"
                type="number"
                min={0}
                max={10000}
                value={settings.platformMaxProjectsPerUser}
                onChange={(e) =>
                  updateField(
                    "platformMaxProjectsPerUser",
                    Math.max(
                      0,
                      Math.min(10000, Number.parseInt(e.target.value, 10) || 0)
                    )
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Per-user project cap. Set to <code>0</code> to disable
                project creation.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <ToggleRow
              id="aiGenerationEnabled"
              label="AI generation enabled"
              description="Master switch for all AI-powered generation features (website generation + section editing)."
              checked={settings.platformAiGenerationEnabled}
              onCheckedChange={(v) =>
                updateField("platformAiGenerationEnabled", v)
              }
            />
            <ToggleRow
              id="registrationEnabled"
              label="New user registration enabled"
              description="When off, the registration endpoint refuses new sign-ups. Existing users can still log in."
              checked={settings.platformRegistrationEnabled}
              onCheckedChange={(v) =>
                updateField("platformRegistrationEnabled", v)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* B. AI Provider Configuration (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            AI Provider Configuration
          </CardTitle>
          <CardDescription>
            Active AI backend used for website generation and section
            editing. Read-only — configured via environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadonlyField
              label="Active provider"
              value={
                aiInfo
                  ? aiInfo.provider === "openrouter"
                    ? "OpenRouter"
                    : "Z.AI (default)"
                  : "—"
              }
              badge={
                aiInfo ? (
                  <Badge variant="secondary">{aiInfo.provider}</Badge>
                ) : null
              }
            />
            <ReadonlyField
              label="Configured model"
              value={aiInfo?.model ?? "—"}
            />
          </div>
          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            Configure via environment variables:{" "}
            <code className="rounded bg-background px-1 py-0.5">
              OPENROUTER_API_KEY
            </code>{" "}
            and{" "}
            <code className="rounded bg-background px-1 py-0.5">
              OPENROUTER_MODEL
            </code>
            . API keys are never exposed to the client and never appear on
            this page. When no OpenRouter key is set, the platform falls
            back to the bundled Z.AI SDK.
          </div>
        </CardContent>
      </Card>

      {/* C. Default Design Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Default Design Tokens
          </CardTitle>
          <CardDescription>
            Brand defaults applied to newly generated websites. Existing
            websites are not retroactively updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <ColorField
              id="primaryColor"
              label="Primary color"
              value={settings.designPrimaryColor}
              onChange={(v) => updateField("designPrimaryColor", v)}
            />
            <ColorField
              id="secondaryColor"
              label="Secondary color"
              value={settings.designSecondaryColor}
              onChange={(v) => updateField("designSecondaryColor", v)}
            />
            <ColorField
              id="accentColor"
              label="Accent color"
              value={settings.designAccentColor}
              onChange={(v) => updateField("designAccentColor", v)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="borderRadius">Default border radius</Label>
            <div className="flex flex-wrap items-center gap-2">
              {RADIUS_PRESETS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant={
                    settings.designBorderRadius === r
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => updateField("designBorderRadius", r)}
                  className="min-w-[60px]"
                >
                  {r}
                </Button>
              ))}
              <Input
                id="borderRadius"
                className="ml-2 w-32"
                value={settings.designBorderRadius}
                onChange={(e) =>
                  updateField("designBorderRadius", e.target.value)
                }
                maxLength={20}
                placeholder="12px"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Applies to buttons, cards, and other rounded elements on new
              websites.
            </p>
          </div>

          {/* Live preview */}
          <div className="rounded-lg border bg-background p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Live preview
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm"
                style={{
                  backgroundColor: settings.designPrimaryColor,
                  borderRadius: settings.designBorderRadius,
                }}
              >
                Primary button
              </button>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm font-medium shadow-sm"
                style={{
                  backgroundColor: settings.designSecondaryColor,
                  color: "#ffffff",
                  borderRadius: settings.designBorderRadius,
                }}
              >
                Secondary
              </button>
              <button
                type="button"
                className="rounded-md border border-current px-4 py-2 text-sm font-medium shadow-sm"
                style={{
                  color: settings.designAccentColor,
                  borderRadius: settings.designBorderRadius,
                }}
              >
                Accent
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* D. Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-muted-foreground" />
            Feature Flags
          </CardTitle>
          <CardDescription>
            Toggle individual product capabilities on or off across the
            platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            id="featureSectionAiEditing"
            label="AI section editing"
            description="Allow users to edit individual sections via AI prompts."
            checked={settings.featureSectionAiEditing}
            onCheckedChange={(v) =>
              updateField("featureSectionAiEditing", v)
            }
          />
          <Separator />
          <ToggleRow
            id="featureAiWebsiteGeneration"
            label="AI website generation"
            description="Allow users to generate full websites from a prompt."
            checked={settings.featureAiWebsiteGeneration}
            onCheckedChange={(v) =>
              updateField("featureAiWebsiteGeneration", v)
            }
          />
          <Separator />
          <ToggleRow
            id="featureVisualEditor"
            label="Visual editor"
            description="If disabled, users can only preview their sites — the editor is hidden."
            checked={settings.featureVisualEditor}
            onCheckedChange={(v) => updateField("featureVisualEditor", v)}
          />
          <Separator />
          <ToggleRow
            id="featureCustomDomains"
            label="Custom domains"
            description="Future feature. Allows users to point their own domain at a published site."
            checked={settings.featureCustomDomains}
            onCheckedChange={(v) =>
              updateField("featureCustomDomains", v)
            }
          />
          <Separator />
          <ToggleRow
            id="featurePublishing"
            label="Publishing"
            description="Allow users to publish their websites. When off, sites stay in draft."
            checked={settings.featurePublishing}
            onCheckedChange={(v) => updateField("featurePublishing", v)}
          />
        </CardContent>
      </Card>

      {/* E. Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible, platform-wide operations. Use with extreme
            caution — these cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DangerRow
            title="Delete all projects"
            description="Permanently deletes every project on the platform EXCEPT those you own. Cascades to all websites and pages. This cannot be undone."
            actionLabel="Delete all projects"
            actionIcon={Trash2}
            destructive
            loading={deletingProjects}
            onConfirm={handleDeleteAllProjects}
            confirmLabel="Yes, delete all projects"
          />
          <Separator />
          <DangerRow
            title="Reset all admin roles"
            description="Demotes every other admin on the platform to a regular user. You will remain an admin. Other admins will lose access immediately on their next request."
            actionLabel="Reset all roles"
            actionIcon={ShieldOff}
            destructive
            loading={resettingRoles}
            onConfirm={handleResetRoles}
            confirmLabel="Yes, demote all other admins"
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ----------------- presentational helpers ----------------- */

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  )
}

function ReadonlyField({
  label,
  value,
  badge,
}: {
  label: string
  value: string
  badge?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="truncate font-medium">{value}</span>
        {badge}
      </div>
    </div>
  )
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-background p-1"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={20}
          className="font-mono"
          aria-label={`${label} hex value`}
        />
      </div>
    </div>
  )
}

function DangerRow({
  title,
  description,
  actionLabel,
  actionIcon: Icon,
  destructive,
  loading,
  onConfirm,
  confirmLabel,
}: {
  title: string
  description: string
  actionLabel: string
  actionIcon: typeof Trash2
  destructive?: boolean
  loading: boolean
  onConfirm: () => void | Promise<void>
  confirmLabel: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={destructive ? "destructive" : "outline"}
            size="sm"
            disabled={loading}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {actionLabel}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}?</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void onConfirm()}
              disabled={loading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                confirmLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
