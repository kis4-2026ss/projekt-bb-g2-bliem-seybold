import { EXTRACTION_PROMPT } from "@/lib/schema";
import type { ExtractionInput, Provider, TokenUsage } from "./types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * OpenRouter adapter. OpenRouter exposes dozens of models — including many free
 * vision models — behind one OpenAI-compatible API and one key. This is what
 * makes broad model comparison cheap. We don't request a JSON response_format
 * here because not every free model supports it; the prompt asks for JSON and
 * the extraction layer tolerates a markdown-fenced reply.
 */
export const openrouterProvider: Provider = {
  async run(input: ExtractionInput, modelId: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in .env.local.");
    }
    if (input.mimeType === "application/pdf") {
      throw new Error("OpenRouter vision models here accept images only — use Gemini for PDFs.");
    }

    const dataUrl = `data:${input.mimeType};base64,${input.dataBase64}`;

    // Free models are frequently rate-limited upstream (429); retry a couple of
    // times with a short backoff before giving up.
    const maxAttempts = 3;
    let res!: Response;
    let latencyMs = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const start = performance.now();
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          // Optional attribution headers OpenRouter recommends.
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Invoice Extractor",
        },
        body: JSON.stringify({
          model: modelId,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: EXTRACTION_PROMPT },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });
      latencyMs = Math.round(performance.now() - start);

      if ((res.status === 429 || res.status === 503) && attempt < maxAttempts) {
        await sleep(attempt * 1500);
        continue;
      }
      break;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter API ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const rawText: string = json.choices?.[0]?.message?.content ?? "";
    const u = json.usage;
    const tokens: TokenUsage = {
      input: u?.prompt_tokens ?? null,
      output: u?.completion_tokens ?? null,
      total: u?.total_tokens ?? null,
    };

    return { rawText, tokens, latencyMs };
  },
};
