"use client";

import type { ExtractionResult } from "@/lib/providers/types";
import type { Score } from "@/lib/scoring";
import ScoreView from "./ScoreView";

/** A small labelled metric pill (latency / tokens). */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </span>
  );
}

/**
 * Shows the outcome of one extraction run: the model, its latency and token
 * usage, and either the pretty-printed JSON or an error (with the raw model
 * output when available).
 */
export default function ResultCard({
  result,
  fileName,
  modelLabel,
  score,
}: {
  result: ExtractionResult;
  fileName: string;
  /** Display name of the model; falls back to its id. */
  modelLabel?: string;
  /** Accuracy vs ground truth, when the file is a scored sample. */
  score?: Score;
}) {
  const tokenText =
    result.tokens.total != null
      ? `${result.tokens.total}` +
        (result.tokens.input != null && result.tokens.output != null
          ? ` (${result.tokens.input}+${result.tokens.output})`
          : "")
      : "—";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              result.ok ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-semibold text-slate-800">
            {modelLabel ?? result.modelId}
          </span>
          <span className="truncate text-xs text-slate-400" title={fileName}>
            · {fileName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {score && (
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                score.accuracy >= 0.9
                  ? "bg-emerald-100 text-emerald-700"
                  : score.accuracy >= 0.7
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {Math.round(score.accuracy * 100)}%
            </span>
          )}
          <Metric label="latency" value={`${result.latencyMs} ms`} />
          <Metric label="tokens" value={tokenText} />
        </div>
      </div>

      {result.ok && result.data ? (
        <>
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {JSON.stringify(result.data, null, 2)}
          </pre>
          {score && <ScoreView score={score} />}
        </>
      ) : (
        <div className="space-y-2">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {result.error ?? "Extraction failed."}
          </p>
          {result.rawText && (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">Show raw model output</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-100 p-3 font-mono">
                {result.rawText}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
