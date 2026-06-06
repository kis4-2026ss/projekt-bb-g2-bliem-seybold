import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { InvoiceSchema } from "@/lib/schema";

export const runtime = "nodejs";

const SAMPLE_DIR = path.join(process.cwd(), "samples");

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/**
 * GET /api/samples
 * Lists the built-in test invoices in samples/. For each image that has a
 * matching <name>.json ground-truth file, returns the image (base64) plus the
 * parsed ground truth, so the UI can load it and score models against it.
 */
export async function GET() {
  let entries: string[];
  try {
    entries = await readdir(SAMPLE_DIR);
  } catch {
    return NextResponse.json({ samples: [] });
  }

  const images = entries.filter((f) =>
    Object.keys(MIME).includes(path.extname(f).toLowerCase()),
  );

  const samples = [];
  for (const img of images) {
    const base = img.slice(0, img.length - path.extname(img).length);
    const truthFile = `${base}.json`;
    if (!entries.includes(truthFile)) continue; // only samples with ground truth

    try {
      const [bytes, truthRaw] = await Promise.all([
        readFile(path.join(SAMPLE_DIR, img)),
        readFile(path.join(SAMPLE_DIR, truthFile), "utf8"),
      ]);
      const parsed = InvoiceSchema.safeParse(JSON.parse(truthRaw));
      if (!parsed.success) continue; // skip malformed ground truth

      samples.push({
        name: base,
        fileName: img,
        mimeType: MIME[path.extname(img).toLowerCase()],
        dataBase64: bytes.toString("base64"),
        groundTruth: parsed.data,
      });
    } catch {
      // skip unreadable sample
    }
  }

  return NextResponse.json({ samples });
}
