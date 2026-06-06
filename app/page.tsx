"use client";

import { useCallback, useEffect, useState } from "react";
import UploadZone from "@/app/components/UploadZone";
import FilePreview from "@/app/components/FilePreview";
import ResultCard from "@/app/components/ResultCard";
import ModelPicker, { type ModelOption } from "@/app/components/ModelPicker";
import SampleLoader, { type Sample } from "@/app/components/SampleLoader";
import {
  fileToBase64,
  revokePreview,
  sampleToUploadedFile,
  toUploadedFile,
  type UploadedFile,
} from "@/lib/files";
import type { ExtractionResult } from "@/lib/providers/types";
import { scoreInvoice } from "@/lib/scoring";

type Run = {
  fileId: string;
  fileName: string;
  modelId: string;
  result: ExtractionResult;
};

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);

  // Load the model catalogue (with availability) and pre-select the first
  // available model so there's always something to run.
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d: { models: ModelOption[] }) => {
        setModels(d.models);
        const firstAvailable = d.models.find((m) => m.available);
        if (firstAvailable) setSelected(new Set([firstAvailable.id]));
      })
      .catch(() => setModels([]));

    // Load built-in sample invoices (with ground truth) for scoring.
    fetch("/api/samples")
      .then((r) => r.json())
      .then((d: { samples: Sample[] }) => setSamples(d.samples))
      .catch(() => setSamples([]));
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => [...prev, ...incoming.map(toUploadedFile)]);
  }, []);

  const loadSample = useCallback((sample: Sample) => {
    setFiles((prev) => [...prev, sampleToUploadedFile(sample)]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) revokePreview(target);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setFiles((prev) => {
      prev.forEach(revokePreview);
      return [];
    });
    setRuns([]);
  }, []);

  const toggleModel = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Run every selected model on every uploaded file, all in parallel, and
  // collect the results for the side-by-side comparison.
  const extractAll = useCallback(async () => {
    const modelIds = [...selected];
    if (files.length === 0 || modelIds.length === 0) return;

    setBusy(true);
    setRuns([]);
    try {
      const jobs: Promise<Run>[] = [];
      for (const f of files) {
        // Encode once per file, reuse across models.
        const dataPromise = fileToBase64(f.file);
        for (const modelId of modelIds) {
          jobs.push(
            (async (): Promise<Run> => {
              const dataBase64 = await dataPromise;
              const res = await fetch("/api/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  modelId,
                  dataBase64,
                  mimeType: f.file.type,
                }),
              });
              const result = (await res.json()) as ExtractionResult;
              return { fileId: f.id, fileName: f.file.name, modelId, result };
            })(),
          );
        }
      }
      setRuns(await Promise.all(jobs));
    } finally {
      setBusy(false);
    }
  }, [files, selected]);

  // Group results by file so each file shows its models side by side.
  const byFile = files
    .map((f) => ({
      file: f,
      runs: runs.filter((r) => r.fileId === f.id),
    }))
    .filter((g) => g.runs.length > 0);

  const canExtract = files.length > 0 && selected.size > 0 && !busy;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Invoice <span className="text-indigo-600">→</span> JSON
        </h1>
        <p className="mt-2 text-slate-600">
          Upload an invoice or shop receipt, extract structured JSON with AI,
          and compare models on quality, latency and tokens.
        </p>
      </header>

      <section className="space-y-6">
        <UploadZone onFiles={addFiles} />

        <SampleLoader samples={samples} onLoad={loadSample} />

        {files.length > 0 && (
          <FilePreview files={files} onRemove={removeFile} />
        )}

        {/* Model selection */}
        {models.length > 0 && (
          <ModelPicker
            models={models}
            selected={selected}
            onToggle={toggleModel}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={clearAll}
            disabled={busy || files.length === 0}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
          >
            Clear all
          </button>

          <button
            type="button"
            onClick={extractAll}
            disabled={!canExtract}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {busy
              ? "Extracting…"
              : `Extract with ${selected.size} model${selected.size === 1 ? "" : "s"} →`}
          </button>
        </div>
      </section>

      {/* Results — one block per file, models side by side */}
      {byFile.length > 0 && (
        <section className="mt-10 space-y-8">
          <h2 className="text-lg font-semibold text-slate-800">Results</h2>
          {byFile.map(({ file, runs }) => (
            <div key={file.id} className="space-y-3">
              <h3 className="text-sm font-medium text-slate-500">
                {file.file.name}
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {runs.map((run) => (
                  <ResultCard
                    key={run.modelId}
                    result={run.result}
                    fileName={file.file.name}
                    modelLabel={
                      models.find((m) => m.id === run.modelId)?.label
                    }
                    score={
                      file.groundTruth && run.result.ok && run.result.data
                        ? scoreInvoice(run.result.data, file.groundTruth)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
