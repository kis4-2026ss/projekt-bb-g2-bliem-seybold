import { InvoiceSchema } from "@/lib/schema";
import { getModel, getProvider } from "@/lib/providers/registry";
import type { ExtractionInput, ExtractionResult } from "@/lib/providers/types";

/**
 * Strip a ```json ... ``` markdown fence if a model wraps its JSON in one.
 * Providers that honour responseMimeType won't need this, but others might.
 */
function stripFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1].trim() : trimmed;
}

/**
 * Run one extraction: pick the provider for the chosen model, call it, then
 * parse and schema-validate the result. All failure modes (bad model id,
 * provider/API error, invalid JSON, schema mismatch) are caught and returned
 * as a result with ok=false, so one bad run never crashes the request.
 */
export async function runExtraction(
  input: ExtractionInput,
  modelId: string,
): Promise<ExtractionResult> {
  const model = getModel(modelId);
  if (!model) {
    return {
      modelId,
      ok: false,
      latencyMs: 0,
      tokens: { input: null, output: null, total: null },
      data: null,
      rawText: null,
      error: `Unknown model "${modelId}".`,
    };
  }

  try {
    const provider = getProvider(model.provider);
    const { rawText, tokens, latencyMs } = await provider.run(input, model.model);

    // Parse the JSON text.
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFence(rawText));
    } catch {
      return {
        modelId,
        ok: false,
        latencyMs,
        tokens,
        data: null,
        rawText,
        error: "Model did not return valid JSON.",
      };
    }

    // Validate against our schema. If it doesn't fit, we still return the raw
    // text so the user can see what came back.
    const result = InvoiceSchema.safeParse(parsed);
    if (!result.success) {
      return {
        modelId,
        ok: false,
        latencyMs,
        tokens,
        data: null,
        rawText,
        error: `JSON did not match the invoice schema: ${result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      };
    }

    return {
      modelId,
      ok: true,
      latencyMs,
      tokens,
      data: result.data,
      rawText,
      error: null,
    };
  } catch (err) {
    return {
      modelId,
      ok: false,
      latencyMs: 0,
      tokens: { input: null, output: null, total: null },
      data: null,
      rawText: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
