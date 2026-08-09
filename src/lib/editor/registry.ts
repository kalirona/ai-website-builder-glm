import type { ComponentRegistry, ComponentDefinition } from "./types"

const registry: ComponentRegistry = {}

export function registerComponent(def: ComponentDefinition): void {
  if (registry[def.type]) {
    console.warn(`[registry] component "${def.type}" already registered, overwriting`)
  }
  registry[def.type] = def
}

export function getComponent(type: string): ComponentDefinition | undefined {
  return registry[type]
}

export function getRegistry(): ComponentRegistry {
  return registry
}

export function listComponents(): ComponentDefinition[] {
  return Object.values(registry)
}

export function listComponentsByCategory() {
  const groups: Record<string, ComponentDefinition[]> = {
    layout: [],
    content: [],
    media: [],
    marketing: [],
  }
  for (const def of Object.values(registry)) {
    ;(groups[def.category] ||= []).push(def)
  }
  return groups
}
