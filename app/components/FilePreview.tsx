"use client";

import { formatSize, type UploadedFile } from "@/lib/files";

/**
 * A grid of thumbnails for the files the user has added. Images show a real
 * preview; PDFs show an icon plus the filename. Each card has a remove button.
 */
export default function FilePreview({
  files,
  onRemove,
}: {
  files: UploadedFile[];
  onRemove: (id: string) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-slate-600">
        {files.length} file{files.length > 1 ? "s" : ""} ready
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {files.map((f) => (
          <li
            key={f.id}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              aria-label={`Remove ${f.file.name}`}
              className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-900"
            >
              ×
            </button>

            <div className="flex h-32 items-center justify-center bg-slate-100">
              {f.kind === "image" ? (
                // Plain <img>: previews are local object URLs, not optimizable
                // by next/image, so we skip the Image component here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.previewUrl}
                  alt={f.file.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-10 w-10"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-xs font-semibold">PDF</span>
                </div>
              )}
            </div>

            <div className="px-3 py-2">
              <p className="truncate text-xs font-medium text-slate-700" title={f.file.name}>
                {f.file.name}
              </p>
              <p className="text-xs text-slate-400">{formatSize(f.file.size)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
