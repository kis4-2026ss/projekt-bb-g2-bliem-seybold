import { EXTRACTION_PROMPT } from "@/lib/schema";
import type { ExtractionInput, Provider, TokenUsage } from "./types";

/**
 * OpenAI adapter (Chat Completions API, called via fetch so we don't pull in
 * another SDK). Vision is done by passing the image as a data URL. PDFs are not
 * supported on this path — use a Gemini model for PDFs.
 */
export const openaiProvider: Provider = {
  async run(input: ExtractionInput, modelId: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in .env.local.");
    }
    if (input.mimeType === "application/pdf") {
      throw new Error("OpenAI models here accept images only — use Gemini for PDFs.");
    }

    const dataUrl = `data:${input.mimeType};base64,${input.dataBase64}`;

    const start = performance.now();
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0,
        response_format: { type: "json_object" },
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
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI API ${res.status}: ${body.slice(0, 200)}`);
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
