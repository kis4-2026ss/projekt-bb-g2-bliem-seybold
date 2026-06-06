[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/5deAuAXI)

# Invoice → JSON · AI Model Comparison

A web app that extracts **structured JSON** from invoice and shop-receipt images
using AI vision models, and lets you **compare different models** on the same
document — by output quality, latency, and token usage.

Built as a school project / MVP. The focus is a working, demoable prototype with
a clean UI, not production hardening.

> Tip: take a screenshot of the running app and save it as `docs/screenshot.png`
> to show it here in the README.

## What it does

1. **Upload** invoices/receipts — drag & drop, click to browse, or paste a
   screenshot (`Ctrl+V`). Accepts PNG, JPEG, WebP and PDF, multiple at once.
2. **Extract to JSON** — sends the image to an AI model and returns a structured
   object (vendor, dates, line items, multiple tax rates, totals, …).
3. **Switch & compare models** — pick one or several models (Gemini, GPT, Claude,
   or free OpenRouter models) and see their JSON **side by side**, each with its
   latency and token count.
4. **Score against ground truth** — built-in sample invoices have a known-correct
   JSON, so a model's output is scored **field-by-field** (accuracy % + a colored
   diff: green = match, red = wrong, grey = missing).

## Quick start

```bash
# 1. install
npm install

# 2. add your API keys
cp .env.example .env.local      # then edit .env.local (see "API keys" below)

# 3. run
npm run dev                     # http://localhost:3000
```

You only need **one** key to start. A free Google Gemini key (no credit card) is
the easiest: <https://aistudio.google.com/apikey>.

### API keys

Keys live in `.env.local` (gitignored) and are only ever used **server-side** —
the browser never sees them. A model becomes selectable in the UI as soon as its
key is present.

| Variable | Provider | Get a key |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini (free tier, also reads PDFs) | <https://aistudio.google.com/apikey> |
| `OPENROUTER_API_KEY` | OpenRouter (one key → many free vision models) | <https://openrouter.ai/keys> |
| `OPENAI_API_KEY` | OpenAI (GPT, needs billing) | <https://platform.openai.com/api-keys> |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | <https://console.anthropic.com/settings/keys> |

After editing `.env.local`, **restart the dev server** so it picks up the keys.

## How it works (architecture)

A single Next.js app (App Router). The UI calls two API routes; the API routes
call the model providers. Keys stay on the server.

```
Browser (app/page.tsx)
  │  uploads file as base64
  ▼
POST /api/extract  ──►  lib/extract.ts  ──►  lib/providers/<provider>.ts  ──►  AI model
  │                         │ parse + validate (Zod)
  ◄─────────────────────────┘ ExtractionResult { data, latencyMs, tokens, error }
  │
  ▼ (if the file is a scored sample)
lib/scoring.ts  ──►  accuracy % + field diff
```

### Key folders

| Path | What it is |
|---|---|
| `app/page.tsx` | The whole UI: upload, model picker, results, scoring. |
| `app/components/` | UI pieces (UploadZone, FilePreview, ModelPicker, ResultCard, ScoreView, SampleLoader). |
| `app/api/extract/` | Runs one extraction (one file × one model). |
| `app/api/models/` | Lists models + whether each provider's key is configured. |
| `app/api/samples/` | Serves the built-in sample invoices + ground truth. |
| `lib/schema.ts` | The invoice **Zod schema** + the extraction prompt (single source of truth). |
| `lib/providers/` | The model-abstraction layer (one adapter per provider) + the model registry. |
| `lib/extract.ts` | Calls a provider, then parses + validates the JSON. |
| `lib/scoring.ts` | Field-by-field comparison against ground truth. |
| `samples/` | Test invoices: `<name>.<img>` + `<name>.json` (ground truth). |
| `scripts/` | `gen_samples.py` (synthetic invoice generator) and a Gemini diagnostic. |

### The model-abstraction layer

Every provider implements one tiny interface (`lib/providers/types.ts`):

```ts
run(input, modelId) => { rawText, tokens, latencyMs }
```

So the rest of the app doesn't care which model ran. Switching models is just
choosing a different entry from the **registry** (`lib/providers/registry.ts`).
Adding a model is a **one-line** change there — no UI edits.

### The JSON schema

Defined once in `lib/schema.ts` (as a Zod schema, so the model output is
validated). Almost every field is nullable, so it fits both a formal invoice and
a shop receipt; `tax_breakdown` is an array so several VAT rates are kept
separately.

```jsonc
{
  "document_type": "invoice" | "receipt" | null,
  "vendor": { "name": ..., "address": ..., "tax_id": ... },
  "invoice_number": null,
  "issue_date": "2026-05-14",          // ISO YYYY-MM-DD
  "due_date": null,
  "currency": "EUR",
  "line_items": [ { "description": ..., "quantity": ..., "unit_price": ..., "amount": ... } ],
  "subtotal": 147.70,
  "tax_breakdown": [ { "rate": 20, "base": 121.70, "amount": 24.34 } ],
  "tax_total": 26.94,
  "total": 174.64,
  "notes": null
}
```

### Scoring

`lib/scoring.ts` flattens the predicted and ground-truth invoices into leaf
fields (including each line-item and tax-line cell) and compares them:

- numbers match within ±0.01; strings are compared case/space-insensitively
- `match` / `wrong` / `missing` per field; **accuracy = matches / total fields**
- `notes` is free-form and intentionally **not** scored

## Adding your own test data

Drop an image and a matching ground-truth JSON (same base name) into `samples/`:

```
samples/my-invoice.jpg
samples/my-invoice.json     # follows lib/schema.ts; use null for absent fields
```

It then appears as a one-click sample and gets scored automatically. See
[`samples/README.md`](samples/README.md).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zod ·
`@google/genai` (other providers via plain `fetch`).

## Known limitations (MVP)

- **Free tiers rate-limit** (HTTP 429/503). The app retries transient errors and
  shows any failure per-model instead of crashing.
- **PDFs**: Gemini and Claude read PDFs directly; OpenAI/OpenRouter adapters here
  accept images only.
- Multi-page documents are treated as a single image for now.

## Future work: training a model

The `samples/` image + JSON pairs are a labelled dataset by design. Because the
schema, prompt, and data are decoupled, a future fine-tuning step can read
`samples/` directly — no restructuring needed.
