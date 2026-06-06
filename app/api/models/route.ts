import { NextResponse } from "next/server";
import { MODELS, isProviderConfigured } from "@/lib/providers/registry";

export const runtime = "nodejs";

/**
 * GET /api/models
 * Returns the model catalogue with an `available` flag per model, computed from
 * whether that provider's API key is set on the server. The UI uses this to
 * enable/disable each choice — so adding a key in .env.local makes its models
 * selectable, with no code change.
 */
export async function GET() {
  const models = MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    free: m.free,
    available: isProviderConfigured(m.provider),
  }));
  return NextResponse.json({ models });
}
