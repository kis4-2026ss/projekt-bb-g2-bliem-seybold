import { EXTRACTION_PROMPT } from "@/lib/schema";
import type { ExtractionInput, Provider, TokenUsage } from "./types";

/** Pause helper for retry backoff. */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type OpenAICompatibleConfig = {
  /** Human-readable provider name, used in error messages. */
  label: string;
  /** Env var holding the API key / bearer token. */
  envVar: string;
  /**
   * Base URL of the OpenAI-compatible API, up to and including the version
   * segment (e.g. ".../v1"), with no trailing slash. "/chat/completions" is
   * appended. May be a function so the URL can be derived from other env vars
   * at call time (Cloudflare needs the account id in the path).
   */
  baseUrl: string | (() => string);
  /** Extra request headers, if a provider wants them. */
  extraHeaders?: Record<string, string>;
  /**
   * Send `response_format: { type: "json_object" }`? Off by default because
   * many open/free vision models reject it. The prompt already asks for JSON
   * and lib/extract.ts strips a markdown ```json fence if one comes back.
   */
  jsonMode?: boolean;
};

/**
 * Factory that builds a Provider for any service speaking the OpenAI Chat
 * Completions API — Groq, Mistral, Together, Fireworks, xAI, NVIDIA NIM,
 * Cloudflare Workers AI, GitHub Models, … Vision is done by passing the image
 * as a data URL, so these adapters accept images only; use Gemini or Claude
 * for PDFs. Adding a new OpenAI-compatible provider is one call to this
 * function plus an entry in the registry — no new request/parsing code.
 */
export function makeOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
): Provider {
  return {
    async run(input: ExtractionInput, modelId: string) {
      const apiKey = process.env[config.envVar];
      if (!apiKey) {
        throw new Error(`${config.envVar} is not set in .env.local.`);
      }
      if (input.mimeType === "application/pdf") {
        throw new Error(
          `${config.label} vision models here accept images only — use Gemini or Claude for PDFs.`,
        );
      }

      const baseUrl =
        typeof config.baseUrl === "function" ? config.baseUrl() : config.baseUrl;
      const url = `${baseUrl}/chat/completions`;
      const dataUrl = `data:${input.mimeType};base64,${input.dataBase64}`;

      const body = {
        model: modelId,
        temperature: 0,
        ...(config.jsonMode
          ? { response_format: { type: "json_object" } }
          : {}),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      };

      // Free tiers frequently rate-limit upstream (429) or shed load (503);
      // retry a couple of times with a short backoff before giving up.
      const maxAttempts = 3;
      let res!: Response;
      let latencyMs = 0;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const start = performance.now();
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...config.extraHeaders,
          },
          body: JSON.stringify(body),
        });
        latencyMs = Math.round(performance.now() - start);

        if ((res.status === 429 || res.status === 503) && attempt < maxAttempts) {
          await sleep(attempt * 1500); // 1.5s, then 3s
          continue;
        }
        break;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${config.label} API ${res.status}: ${text.slice(0, 200)}`);
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
}

// --- Configured provider instances ----------------------------------------
// Base URLs and model strings are easy to swap if a provider changes them.

/** Mistral La Plateforme — free Experiment tier; Pixtral vision models. */
export const mistralProvider = makeOpenAICompatibleProvider({
  label: "Mistral",
  envVar: "MISTRAL_API_KEY",
  baseUrl: "https://api.mistral.ai/v1",
});

/** Groq — free tier, no credit card; Llama 4 Scout / 3.2 Vision. */
export const groqProvider = makeOpenAICompatibleProvider({
  label: "Groq",
  envVar: "GROQ_API_KEY",
  baseUrl: "https://api.groq.com/openai/v1",
});

/** NVIDIA NIM (build.nvidia.com) — 1,000 free credits on signup. */
export const nvidiaProvider = makeOpenAICompatibleProvider({
  label: "NVIDIA NIM",
  envVar: "NVIDIA_API_KEY",
  baseUrl: "https://integrate.api.nvidia.com/v1",
});

/** Together AI — trial credits; 200+ open models incl. vision. */
export const togetherProvider = makeOpenAICompatibleProvider({
  label: "Together AI",
  envVar: "TOGETHER_API_KEY",
  baseUrl: "https://api.together.xyz/v1",
});

/** Fireworks AI — trial credits; optimized open-model inference. */
export const fireworksProvider = makeOpenAICompatibleProvider({
  label: "Fireworks AI",
  envVar: "FIREWORKS_API_KEY",
  baseUrl: "https://api.fireworks.ai/inference/v1",
});

/** xAI Grok — sign-up credits; OpenAI-compatible, Grok vision models. */
export const xaiProvider = makeOpenAICompatibleProvider({
  label: "xAI Grok",
  envVar: "XAI_API_KEY",
  baseUrl: "https://api.x.ai/v1",
});

/** GitHub Models — free with a GitHub account (PAT with `models: read`). */
export const githubProvider = makeOpenAICompatibleProvider({
  label: "GitHub Models",
  envVar: "GITHUB_MODELS_TOKEN",
  baseUrl: "https://models.github.ai/inference",
});

/**
 * Cloudflare Workers AI — 10k free requests/day. Needs BOTH an API token
 * (CLOUDFLARE_API_TOKEN) and the account id (CLOUDFLARE_ACCOUNT_ID), since the
 * account id lives in the request path.
 */
export const cloudflareProvider = makeOpenAICompatibleProvider({
  label: "Cloudflare Workers AI",
  envVar: "CLOUDFLARE_API_TOKEN",
  baseUrl: () => {
    const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!acct) {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID is not set in .env.local (Cloudflare needs both an account id and an API token).",
      );
    }
    return `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/v1`;
  },
});
