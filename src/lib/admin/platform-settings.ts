/**
 * Platform-wide settings schema, defaults, and helpers.
 *
 * Settings live in the `PlatformSetting` table as simple key/value rows.
 * This module is the single source of truth for the keys we know about,
 * their types, and their default values. Callers (API + UI) all import
 * from here so the keys stay in sync.
 */

import { db } from "@/lib/db"

/** All known platform setting keys. */
export const PLATFORM_SETTING_KEYS = [
  // A. Platform configuration
  "platform.name",
  "platform.supportEmail",
  "platform.maxProjectsPerUser",
  "platform.aiGenerationEnabled",
  "platform.registrationEnabled",

  // D. Feature flags
  "feature.sectionAiEditing",
  "feature.aiWebsiteGeneration",
  "feature.visualEditor",
  "feature.customDomains",
  "feature.publishing",

  // C. Default design tokens
  "design.primaryColor",
  "design.secondaryColor",
  "design.accentColor",
  "design.borderRadius",
] as const

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number]

/** A typed shape for the entire settings object returned to the client. */
export interface PlatformSettings {
  // A. Platform configuration
  platformName: string
  platformSupportEmail: string
  platformMaxProjectsPerUser: number
  platformAiGenerationEnabled: boolean
  platformRegistrationEnabled: boolean

  // D. Feature flags
  featureSectionAiEditing: boolean
  featureAiWebsiteGeneration: boolean
  featureVisualEditor: boolean
  featureCustomDomains: boolean
  featurePublishing: boolean

  // C. Default design tokens
  designPrimaryColor: string
  designSecondaryColor: string
  designAccentColor: string
  designBorderRadius: string
}

/** Raw string defaults — what gets stored on first read / seed. */
export const PLATFORM_SETTING_DEFAULTS: Record<PlatformSettingKey, string> = {
  "platform.name": "Webcraft",
  "platform.supportEmail": "support@webcraft.app",
  "platform.maxProjectsPerUser": "10",
  "platform.aiGenerationEnabled": "true",
  "platform.registrationEnabled": "true",

  "feature.sectionAiEditing": "true",
  "feature.aiWebsiteGeneration": "true",
  "feature.visualEditor": "true",
  "feature.customDomains": "false",
  "feature.publishing": "true",

  "design.primaryColor": "#4f46e5",
  "design.secondaryColor": "#0ea5e9",
  "design.accentColor": "#f59e0b",
  "design.borderRadius": "12px",
}

/**
 * Map between the camelCase client field name and the dotted DB key.
 * Used by the API layer to translate between the two shapes.
 */
export const FIELD_TO_KEY: Record<keyof PlatformSettings, PlatformSettingKey> = {
  platformName: "platform.name",
  platformSupportEmail: "platform.supportEmail",
  platformMaxProjectsPerUser: "platform.maxProjectsPerUser",
  platformAiGenerationEnabled: "platform.aiGenerationEnabled",
  platformRegistrationEnabled: "platform.registrationEnabled",

  featureSectionAiEditing: "feature.sectionAiEditing",
  featureAiWebsiteGeneration: "feature.aiWebsiteGeneration",
  featureVisualEditor: "feature.visualEditor",
  featureCustomDomains: "feature.customDomains",
  featurePublishing: "feature.publishing",

  designPrimaryColor: "design.primaryColor",
  designSecondaryColor: "design.secondaryColor",
  designAccentColor: "design.accentColor",
  designBorderRadius: "design.borderRadius",
}

export const KEY_TO_FIELD: Record<PlatformSettingKey, keyof PlatformSettings> =
  Object.fromEntries(
    Object.entries(FIELD_TO_KEY).map(([field, key]) => [key, field])
  ) as Record<PlatformSettingKey, keyof PlatformSettings>

/** Parse a raw string DB value into the typed field on PlatformSettings. */
function parseValue(
  field: keyof PlatformSettings,
  raw: string
): string | number | boolean {
  switch (field) {
    case "platformMaxProjectsPerUser": {
      const n = Number.parseInt(raw, 10)
      return Number.isFinite(n) && n >= 0 ? n : 10
    }
    case "platformAiGenerationEnabled":
    case "platformRegistrationEnabled":
    case "featureSectionAiEditing":
    case "featureAiWebsiteGeneration":
    case "featureVisualEditor":
    case "featureCustomDomains":
    case "featurePublishing":
      return raw === "true"
    default:
      return raw
  }
}

/**
 * Read all platform settings from the DB, falling back to defaults for
 * any missing keys. Returns the typed camelCase shape used by the API.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await db.platformSetting.findMany({
    where: { key: { in: [...PLATFORM_SETTING_KEYS] } },
  })

  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value

  const result = {} as PlatformSettings
  for (const field of Object.keys(FIELD_TO_KEY) as (keyof PlatformSettings)[]) {
    const key = FIELD_TO_KEY[field]
    const raw = map[key] ?? PLATFORM_SETTING_DEFAULTS[key]
    ;(result as unknown as Record<string, unknown>)[field] = parseValue(
      field,
      raw
    )
  }
  return result
}

/**
 * Validate + persist a partial update. Returns the new full typed shape.
 *
 * - Ignores any unknown field names.
 * - Validates types (booleans → must be true/false, numbers → must be int ≥ 0,
 *   strings → trimmed, max length 500).
 * - For each known field, upserts the corresponding PlatformSetting row.
 */
export async function updatePlatformSettings(
  input: Partial<Record<keyof PlatformSettings, unknown>>
): Promise<PlatformSettings> {
  const knownFields = Object.keys(FIELD_TO_KEY) as (keyof PlatformSettings)[]
  const writes: { key: PlatformSettingKey; value: string }[] = []

  for (const field of knownFields) {
    if (!(field in input)) continue
    const raw = input[field]
    const key = FIELD_TO_KEY[field]

    // Type-check + clean per field.
    switch (field) {
      case "platformMaxProjectsPerUser": {
        const n =
          typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw)
        if (!Number.isFinite(n) || n < 0 || n > 10000) {
          throw new Error(
            `Invalid value for ${field}: must be an integer between 0 and 10000`
          )
        }
        writes.push({ key, value: String(n) })
        break
      }
      case "platformAiGenerationEnabled":
      case "platformRegistrationEnabled":
      case "featureSectionAiEditing":
      case "featureAiWebsiteGeneration":
      case "featureVisualEditor":
      case "featureCustomDomains":
      case "featurePublishing": {
        const b =
          raw === true ||
          raw === "true" ||
          raw === 1 ||
          raw === "1" ||
          raw === "on"
        writes.push({ key, value: b ? "true" : "false" })
        break
      }
      case "platformSupportEmail": {
        const s = typeof raw === "string" ? raw.trim().slice(0, 500) : ""
        writes.push({ key, value: s })
        break
      }
      case "designBorderRadius": {
        const s = typeof raw === "string" ? raw.trim().slice(0, 20) : "12px"
        writes.push({ key, value: s })
        break
      }
      default: {
        // Generic string field — trim + cap length.
        const s =
          typeof raw === "string"
            ? raw.trim().slice(0, 500)
            : String(raw ?? "")
        writes.push({ key, value: s })
      }
    }
  }

  if (writes.length > 0) {
    await db.$transaction(
      writes.map((w) =>
        db.platformSetting.upsert({
          where: { key: w.key },
          update: { value: w.value },
          create: { key: w.key, value: w.value },
        })
      )
    )
  }

  return getPlatformSettings()
}
