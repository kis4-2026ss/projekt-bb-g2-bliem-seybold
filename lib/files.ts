/**
 * Shared types and helpers for handling uploaded invoice/receipt files.
 * Kept framework-agnostic so it can be reused by the extraction layer later.
 */
import type { Invoice } from "@/lib/schema";

// What the AI vision models can read. PDFs are accepted but (for the MVP) we
// will treat them as their first page when we get to extraction.
export const ACCEPTED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export type UploadKind = "image" | "pdf";

export type UploadedFile = {
  /** Stable id so React lists and removal work cleanly. */
  id: string;
  file: File;
  /** Object URL for image previews; empty string for PDFs (shown as an icon). */
  previewUrl: string;
  kind: UploadKind;
  /**
   * Known-correct extraction, present only for built-in sample invoices. When
   * set, results for this file are scored against it.
   */
  groundTruth?: Invoice;
};

/** True if the browser File is a type we accept. */
export function isAccepted(file: File): boolean {
  return (ACCEPTED_MIME as readonly string[]).includes(file.type);
}

/** Human-readable file size, e.g. "1.2 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Wrap a raw File into our UploadedFile, creating a preview URL for images.
 * Remember to revoke previewUrl (revokePreview) when the file is removed.
 */
export function toUploadedFile(file: File): UploadedFile {
  const kind: UploadKind = file.type === "application/pdf" ? "pdf" : "image";
  return {
    id: crypto.randomUUID(),
    file,
    kind,
    previewUrl: kind === "image" ? URL.createObjectURL(file) : "",
  };
}

/** Release the object URL backing a preview to avoid memory leaks. */
export function revokePreview(uploaded: UploadedFile): void {
  if (uploaded.previewUrl) URL.revokeObjectURL(uploaded.previewUrl);
}

/** Decode a base64 string into a browser File. */
export function base64ToFile(
  base64: string,
  fileName: string,
  mimeType: string,
): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mimeType });
}

/** Build an UploadedFile from a built-in sample, attaching its ground truth. */
export function sampleToUploadedFile(sample: {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  groundTruth: Invoice;
}): UploadedFile {
  const file = base64ToFile(sample.dataBase64, sample.fileName, sample.mimeType);
  const uploaded = toUploadedFile(file);
  uploaded.groundTruth = sample.groundTruth;
  return uploaded;
}

/**
 * Read a File as a base64 string (without the "data:...;base64," prefix),
 * ready to send to the extraction API.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like "data:image/png;base64,AAAA..." — keep only the data.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
