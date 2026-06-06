"use client";

import type { FieldStatus, Score } from "@/lib/scoring";

const STATUS_STYLE: Record<FieldStatus, { dot: string; label: string }> = {
  match: { dot: "bg-emerald-500", label: "match" },
  wrong: { dot: "bg-red-500", label: "wrong" },
  missing: { dot: "bg-slate-300", label: "missing" },
};

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

/**
 * Shows how a model's output scored against the ground truth: an accuracy
 * percentage and a field-by-field diff (green = match, red = wrong,
 * grey = missing). Mismatches are listed first so problems stand out.
 */
export default function ScoreView({ score }: { score: Score }) {
  const pct = Math.round(score.accuracy * 100);
  const barColor =
    pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";

  // Mismatches first, then matches — easier to scan what went wrong.
  const ordered = [...score.fields].sort((a, b) => {
    const rank = (s: FieldStatus) => (s === "match" ? 1 : 0);
    return rank(a.status) - rank(b.status);
  });
  const mismatches = score.fields.filter((f) => f.status !== "match").length;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-700">
          Accuracy {pct}%
        </span>
        <span className="text-xs text-slate-500">
          {score.correct}/{score.total} fields
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <details open={mismatches > 0} className="text-xs">
        <summary className="cursor-pointer text-slate-500">
          {mismatches === 0
            ? "All fields match — show details"
            : `${mismatches} field${mismatches === 1 ? "" : "s"} differ — show diff`}
        </summary>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-1 pr-2 font-medium">Field</th>
              <th className="py-1 pr-2 font-medium">Expected</th>
              <th className="py-1 font-medium">Got</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((f) => (
              <tr key={f.path} className="border-t border-slate-200 align-top">
                <td className="py-1 pr-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_STYLE[f.status].dot}`}
                    />
                    <span className="font-mono text-slate-600">{f.path}</span>
                  </span>
                </td>
                <td className="py-1 pr-2 font-mono text-slate-500">
                  {fmt(f.expected)}
                </td>
                <td
                  className={`py-1 font-mono ${
                    f.status === "match" ? "text-slate-500" : "text-red-600"
                  }`}
                >
                  {fmt(f.got)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
