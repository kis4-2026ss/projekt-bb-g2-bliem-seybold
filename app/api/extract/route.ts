import { NextResponse } from "next/server";
import { runExtraction } from "@/lib/extract";

// The Google SDK needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

/**
 * POST /api/extract
 * Body: { modelId: string, dataBase64: string, mimeType: string }
 * Returns an ExtractionResult (see lib/providers/types.ts).
 *
 * The image bytes are sent base64-encoded in JSON. Keys live only on the
 * server (.env.local), so the model is never called from the browser.
 */
export async function POST(req: Request) {
  let body: { modelId?: string; dataBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { modelId, dataBase64, mimeType } = body;
  if (!modelId || !dataBase64 || !mimeType) {
    return NextResponse.json(
      { error: "modelId, dataBase64 and mimeType are required." },
      { status: 400 },
    );
  }

  const result = await runExtraction({ dataBase64, mimeType }, modelId);
  // Always 200: extraction failures are reported in the result body (ok:false)
  // so the UI can show them per-model rather than treating them as HTTP errors.
  return NextResponse.json(result);
}
