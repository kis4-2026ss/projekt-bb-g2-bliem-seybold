// One-off verification: confirms the Gemini key works, lists available Flash
// models, and runs a real extraction on the sample invoice.
// Run with: node scripts/verify_gemini.mjs
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

// Tiny .env.local loader (avoids a dependency).
function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not set in .env.local");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// 1) List a few vision-capable Flash models so we use a valid model id.
console.log("=== Available models (flash) ===");
try {
  const pager = await ai.models.list();
  for await (const m of pager) {
    if (/flash/i.test(m.name ?? "")) console.log(" •", m.name);
  }
} catch (e) {
  console.log("(could not list models:", e.message, ")");
}

// 2) Real extraction on the sample invoice.
const data = readFileSync("samples/invoice-acme-01.png").toString("base64");
const prompt =
  "Extract this invoice into JSON with fields vendor, invoice_number, issue_date, " +
  "currency, line_items, tax_breakdown, total. Respond with ONLY JSON.";

const model = process.argv[2] || "gemini-2.5-flash";
console.log(`\n=== Extraction with ${model} ===`);
const start = performance.now();
const res = await ai.models.generateContent({
  model,
  contents: [
    { role: "user", parts: [
      { inlineData: { mimeType: "image/png", data } },
      { text: prompt },
    ] },
  ],
  config: { responseMimeType: "application/json", temperature: 0 },
});
const ms = Math.round(performance.now() - start);
console.log("latency:", ms, "ms");
console.log("tokens:", JSON.stringify(res.usageMetadata));
console.log("output:\n", res.text);
