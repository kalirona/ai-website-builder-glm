import { NextResponse } from "next/server"
import { getProviderInfo } from "@/lib/ai/provider-resolver"

/**
 * GET /api/ai-info — returns metadata about the active AI provider.
 *
 * This is a dev-only indicator. It NEVER returns API keys — only the
 * provider name ("openrouter" or "zai") and the configured model name.
 */
export async function GET() {
  return NextResponse.json(getProviderInfo())
}
