import type { Provider } from "./types";
import { googleProvider } from "./google";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { openrouterProvider } from "./openrouter";

export type ProviderName = "google" | "openai" | "anthropic" | "openrouter";

/** A model the user can pick in the UI. */
export type ModelConfig = {
  /** Our stable id, used in API requests and the UI. */
  id: string;
  /** Friendly label shown in the picker. */
  label: string;
  /** Which provider runs it. */
  provider: ProviderName;
  /** The provider's own model string. */
  model: string;
  /** Free-tier model? Used to highlight the "free models" focus in the UI. */
  free: boolean;
};

/** Which env var holds each provider's API key. */
export const PROVIDER_ENV: Record<ProviderName, string> = {
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/** Maps a provider name to its implementation. */
const PROVIDERS: Record<ProviderName, Provider> = {
  google: googleProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
};

/**
 * The catalogue of selectable models. Adding a model is a one-line change here
 * — no UI edits required. Model strings for OpenAI/OpenRouter are easy to swap
 * if a newer/cheaper model appears. Gemini 3 Flash (preview) is the default
 * because it's confirmed available on the free tier and handles PDFs too.
 */
export const MODELS: ModelConfig[] = [
  // --- Free ---
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    provider: "google",
    model: "gemini-3-flash-preview",
    free: true,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    model: "gemini-2.5-flash",
    free: true,
  },
  {
    // One representative free vision model on OpenRouter. Browse more (and copy
    // their ":free" ids) at https://openrouter.ai/models?max_price=0
    id: "or-nemotron-vision",
    label: "Nemotron Nano VL (OpenRouter, free)",
    provider: "openrouter",
    model: "nvidia/nemotron-nano-12b-v2-vl:free",
    free: true,
  },
  // --- Paid baselines (your keys) ---
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    model: "gpt-4o-mini",
    free: false,
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    free: false,
  },
];

export function getModel(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getProvider(name: ProviderName): Provider {
  return PROVIDERS[name];
}

/** True if the API key for this provider is present in the environment. */
export function isProviderConfigured(name: ProviderName): boolean {
  const v = process.env[PROVIDER_ENV[name]];
  return typeof v === "string" && v.trim().length > 0;
}
