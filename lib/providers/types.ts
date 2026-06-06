import type { Invoice } from "@/lib/schema";

/**
 * Token usage for one extraction. Any field may be null because not every
 * provider reports every count.
 */
export type TokenUsage = {
  input: number | null;
  output: number | null;
  total: number | null;
};

/** What the UI receives back for a single (file × model) extraction run. */
export type ExtractionResult = {
  modelId: string;
  ok: boolean;
  /** Wall-clock time of the model call, in milliseconds. */
  latencyMs: number;
  tokens: TokenUsage;
  /** Parsed + schema-validated invoice, or null if extraction/validation failed. */
  data: Invoice | null;
  /** Raw text the model returned — handy for debugging or when parsing fails. */
  rawText: string | null;
  /** Human-readable error message, or null on success. */
  error: string | null;
};

/** The image (or PDF) to extract, already in base64. */
export type ExtractionInput = {
  /** Base64-encoded file bytes (no data: prefix). */
  dataBase64: string;
  /** MIME type, e.g. "image/png" or "application/pdf". */
  mimeType: string;
};

/**
 * Every model provider implements this one method. Swapping models is just
 * picking a different provider from the registry — the rest of the app is
 * unaware of which one ran.
 */
export type Provider = {
  /** Calls the model and returns the raw text + token usage + latency. */
  run: (
    input: ExtractionInput,
    modelId: string,
  ) => Promise<{ rawText: string; tokens: TokenUsage; latencyMs: number }>;
};
