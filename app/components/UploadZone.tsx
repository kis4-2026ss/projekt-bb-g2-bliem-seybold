"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAccepted } from "@/lib/files";

/**
 * The upload surface. Supports three ways to add files, which is the UX we
 * recommended: drag-and-drop, click-to-browse, and clipboard paste (Ctrl+V a
 * screenshot). It only *collects* files and hands them up via onFiles — the
 * parent owns the list, previews and (later) extraction.
 */
export default function UploadZone({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter to accepted types before handing up, so the rest of the app can
  // assume every file is a PNG/JPEG/WebP/PDF.
  const accept = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const files = Array.from(list).filter(isAccepted);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  // Clipboard paste: grab any image items from a pasted screenshot.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pasted: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && isAccepted(file)) pasted.push(file);
        }
      }
      if (pasted.length) {
        e.preventDefault();
        onFiles(pasted);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        accept(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors",
        dragOver
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        {/* upload icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div>
        <p className="text-base font-medium text-slate-800">
          Drag &amp; drop invoices here
        </p>
        <p className="text-sm text-slate-500">
          or{" "}
          <span className="font-medium text-indigo-600">click to browse</span>,
          or paste a screenshot with{" "}
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
            Ctrl
          </kbd>
          +
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
            V
          </kbd>
        </p>
        <p className="mt-1 text-xs text-slate-400">PNG, JPEG, WebP or PDF</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          // reset so selecting the same file again still fires onChange
          e.target.value = "";
        }}
      />
    </div>
  );
}
