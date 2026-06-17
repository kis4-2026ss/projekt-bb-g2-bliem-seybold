import type { Provider } from "./types";
import { googleProvider } from "./google";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { openrouterProvider } from "./openrouter";
import {
  mistralProvider,
  groqProvider,
  nvidiaProvider,
  togetherProvider,
  fireworksProvider,
  xaiProvider,
  githubProvider,
  cloudflareProvider,
} from "./openaiCompatible";

export type ProviderName =
  | "google"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "mistral"
  | "groq"
  | "nvidia"
  | "together"
  | "fireworks"
  | "xai"
  | "github"
  | "cloudflare";

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

/**
 * Which env var holds each provider's API key. Adding a key for any of these
 * to .env.local (and restarting) makes that provider's models selectable in
 * the UI — no code change required.
 *
 * Note: Cloudflare additionally needs CLOUDFLARE_ACCOUNT_ID (the account id is
 * part of its request URL); the token below is what the UI checks for.
 */
export const PROVIDER_ENV: Record<ProviderName, string> = {
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  mistral: "MISTRAL_API_KEY",
  groq: "GROQ_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  together: "TOGETHER_API_KEY",
  fireworks: "FIREWORKS_API_KEY",
  xai: "XAI_API_KEY",
  github: "GITHUB_MODELS_TOKEN",
  cloudflare: "CLOUDFLARE_API_TOKEN",
};

/** Maps a provider name to its implementation. */
const PROVIDERS: Record<ProviderName, Provider> = {
  google: googleProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
  mistral: mistralProvider,
  groq: groqProvider,
  nvidia: nvidiaProvider,
  together: togetherProvider,
  fireworks: fireworksProvider,
  xai: xaiProvider,
  github: githubProvider,
  cloudflare: cloudflareProvider,
};

/**
 * The catalogue of selectable models. Adding a model is a one-line change here
 * — no UI edits required. Model strings are easy to swap if a newer/cheaper
 * model appears (or if a provider renames one). Gemini 3 Flash (preview) is the
 * default because it's confirmed available on the free tier and handles PDFs.
 *
 * Every model below shows in the picker; one whose provider key isn't set is
 * shown disabled with a "no key" hint until you add the key to .env.local.
 *
 * IMPORTANT: the OpenAI/OpenRouter/Mistral/Groq/NVIDIA/Together/Fireworks/xAI/
 * GitHub/Cloudflare paths send the file as an image — they accept images only.
 * PDFs work on the Gemini and Claude models.
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

  // --- Bring-your-own-key providers (add the key in .env.local to enable) ---
  // Mistral — free Experiment tier; Pixtral vision.
  {
    id: "pixtral-12b",
    label: "Pixtral 12B (Mistral)",
    provider: "mistral",
    model: "pixtral-12b-2409",
    free: true,
  },
  // Groq — free, no credit card; Llama 4 Scout vision (preview upstream).
  {
    id: "groq-llama4-scout",
    label: "Llama 4 Scout Vision (Groq)",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    free: true,
  },

  // GitHub Models — free with a GitHub account.
  {
    id: "github-gpt-4o",
    label: "Deepseek (GitHub Models)",
    provider: "github",
    model: "Deepseek/DeepSeek-R1-0528",
    free: true,
  },
  // Cloudflare Workers AI — 10k requests/day free (also needs CLOUDFLARE_ACCOUNT_ID).
  {
    id: "cf-llama32-vision",
    label: "Llama 3.2 11B Vision (Cloudflare)",
    provider: "cloudflare",
    model: "@cf/meta/llama-3.2-11b-vision-instruct",
    free: true,
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
