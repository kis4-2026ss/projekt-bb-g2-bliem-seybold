import { GoogleGenAI } from "@google/genai";
import { EXTRACTION_PROMPT } from "@/lib/schema";
import type { ExtractionInput, Provider, TokenUsage } from "./types";

/** Pause helper for retry backoff. */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Google Gemini adapter. Gemini accepts both images and PDFs as inline data,
 * so we send the file bytes straight through with their MIME type — no PDF
 * pre-rendering needed for the MVP. The free tier covers the Flash models and
 * includes vision at no extra cost, which is why it's our default model.
 */
export const googleProvider: Provider = {
  async run(input: ExtractionInput, modelId: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // The free tier occasionally returns 503 (high demand) or 429 (rate limit).
    // These are transient, so we retry a couple of times with a short backoff.
    const maxAttempts = 3;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const start = performance.now();
        const res = await ai.models.generateContent({
          model: modelId,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: input.mimeType, data: input.dataBase64 } },
                { text: EXTRACTION_PROMPT },
              ],
            },
          ],
          config: {
            // Raw JSON out, deterministic for fair comparison, and no "thinking"
            // budget — extraction doesn't need reasoning and it ~halves latency.
            responseMimeType: "application/json",
            temperature: 0,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        const latencyMs = Math.round(performance.now() - start);

        const u = res.usageMetadata;
        const tokens: TokenUsage = {
          input: u?.promptTokenCount ?? null,
          output: u?.candidatesTokenCount ?? null,
          total: u?.totalTokenCount ?? null,
        };

        return { rawText: res.text ?? "", tokens, latencyMs };
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const transient = msg.includes("503") || msg.includes("429");
        if (transient && attempt < maxAttempts) {
          await sleep(attempt * 1500); // 1.5s, then 3s
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  },
};
