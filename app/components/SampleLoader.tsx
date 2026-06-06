"use client";

import type { Invoice } from "@/lib/schema";

/** A built-in sample invoice as returned by GET /api/samples. */
export type Sample = {
  name: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  groundTruth: Invoice;
};

/**
 * Buttons to load the built-in sample invoices (which have ground truth, so
 * results get scored). Lets you demo the comparison without uploading anything.
 */
export default function SampleLoader({
  samples,
  onLoad,
}: {
  samples: Sample[];
  onLoad: (sample: Sample) => void;
}) {
  if (samples.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-500">Or try a sample:</span>
      {samples.map((s) => (
        <button
          key={s.name}
          type="button"
          onClick={() => onLoad(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
        >
          <span className="text-amber-500">★</span>
          {s.name}
        </button>
      ))}
    </div>
  );
}
