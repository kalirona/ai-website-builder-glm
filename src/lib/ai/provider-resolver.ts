// server-only module — the single entry point for getting the AI provider.
// API routes import { aiProvider } from here instead of importing ZAIProvider
// or OpenRouterProvider directly. This keeps the provider selection logic in
// one place — no route needs to know which backend is active.

import type { AIProvider } from "./provider"
import { ZAIProvider } from "./zai-provider"

// Cache the OpenRouter provider so we only construct it once.
let openRouterProvider: AIProvider | null = null

/**
 * Resolve the active AI provider based on environment variables.
 *
 * Selection logic:
 *  - If OPENROUTER_API_KEY is set → use OpenRouterProvider (calls OpenRouter
 *    API with the configured OPENROUTER_MODEL, e.g. GLM-4.5).
 *  - Otherwise → use ZAIProvider (z-ai-web-dev-sdk, the default).
 *
 * This is a singleton — the provider is instantiated once per process.
 * No component or route needs to know which backend is active.
 */
async function resolveProvider(): Promise<AIProvider> {
  const useOpenRouter = !!process.env.OPENROUTER_API_KEY

  if (useOpenRouter) {
    if (!openRouterProvider) {
      // Dynamic import so the OpenRouterProvider module (which checks for
      // the API key in its constructor) is only loaded when needed.
      const { OpenRouterProvider } = await import("./openrouter-provider")
      openRouterProvider = new OpenRouterProvider()
    }
    return openRouterProvider
  }

  return new ZAIProvider()
}

/**
 * The singleton AI provider promise. Routes await this to get the active
 * provider. This keeps the OpenRouter module lazy-loaded.
 */
let _providerPromise: Promise<AIProvider> | null = null
export function getAIProvider(): Promise<AIProvider> {
  if (!_providerPromise) {
    _providerPromise = resolveProvider()
  }
  return _providerPromise
}

/**
 * Returns metadata about the active provider for the dev indicator.
 * NEVER includes API keys — only the provider name + model.
 */
export function getProviderInfo(): {
  provider: "openrouter" | "zai"
  model: string
} {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL || "z-ai/glm-4.5",
    }
  }
  return {
    provider: "zai",
    model: "z-ai-web-dev-sdk (default)",
  }
}
