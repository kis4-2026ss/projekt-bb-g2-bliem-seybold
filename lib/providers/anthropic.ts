import { EXTRACTION_PROMPT } from "@/lib/schema";
import type { ExtractionInput, Provider, TokenUsage } from "./types";

/**
 * Anthropic (Claude) adapter, via the Messages API with fetch. Claude reads
 * both images and PDFs: images go in an "image" block, PDFs in a "document"
 * block. We ask for JSON in the prompt and parse it downstream.
 */
export const anthropicProvider: Provider = {
  async run(input: ExtractionInput, modelId: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set in .env.local.");
    }

    // Choose the right content block for the file type.
    const fileBlock =
      input.mimeType === "application/pdf"
        ? {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: input.dataBase64,
            },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mimeType,
              data: input.dataBase64,
            },
          };

    const start = performance.now();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 2048,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [fileBlock, { type: "text", text: EXTRACTION_PROMPT }],
          },
        ],
      }),
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    // Concatenate any text blocks in the response.
    const rawText: string = (json.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    const u = json.usage;
    const inTok = u?.input_tokens ?? null;
    const outTok = u?.output_tokens ?? null;
    const tokens: TokenUsage = {
      input: inTok,
      output: outTok,
      total: inTok != null && outTok != null ? inTok + outTok : null,
    };

    return { rawText, tokens, latencyMs };
  },
};
