import type { Invoice } from "@/lib/schema";

/**
 * Field-level scoring of a predicted invoice against a known-correct one.
 *
 * We flatten both invoices into comparable leaf fields (including nested vendor
 * fields and each line-item / tax-line cell), then compare field by field:
 *   - match   : values are equal (numbers within a small epsilon, strings
 *               compared case/space-insensitively, null == null counts as a match)
 *   - wrong   : both present but different, or the model invented a value the
 *               ground truth says should be null
 *   - missing : ground truth has a value but the model returned null
 *
 * accuracy = matches / total fields. This is deliberately simple and easy to
 * explain — good enough to compare models meaningfully.
 */

export type FieldStatus = "match" | "wrong" | "missing";

export type FieldScore = {
  path: string;
  expected: unknown;
  got: unknown;
  status: FieldStatus;
};

export type Score = {
  fields: FieldScore[];
  correct: number;
  total: number;
  /** 0..1 */
  accuracy: number;
};

function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/** Try to read a value as a number (accepts numeric strings like "174.64"). */
function asNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normString(v: unknown): string {
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

/** Equality used for non-null values: numbers by value (±0.01), else strings. */
function valuesEqual(got: unknown, expected: unknown): boolean {
  const gn = asNumber(got);
  const en = asNumber(expected);
  if (gn !== null && en !== null) return Math.abs(gn - en) < 0.01;
  return normString(got) === normString(expected);
}

/** Compare one leaf field and push its result. */
function compareField(
  path: string,
  got: unknown,
  expected: unknown,
  out: FieldScore[],
) {
  const gMissing = isNullish(got);
  const eMissing = isNullish(expected);

  let status: FieldStatus;
  if (eMissing && gMissing) status = "match";
  else if (!eMissing && gMissing) status = "missing";
  else if (eMissing && !gMissing) status = "wrong"; // invented value
  else status = valuesEqual(got, expected) ? "match" : "wrong";

  out.push({ path, got, expected, status });
}

// Scalar (top-level) fields to compare directly.
const SCALAR_FIELDS: (keyof Invoice)[] = [
  "document_type",
  "invoice_number",
  "issue_date",
  "due_date",
  "currency",
  "subtotal",
  "tax_total",
  "total",
];

const LINE_ITEM_KEYS = ["description", "quantity", "unit_price", "amount"] as const;
const TAX_KEYS = ["rate", "base", "amount"] as const;

export function scoreInvoice(predicted: Invoice, truth: Invoice): Score {
  const fields: FieldScore[] = [];

  // Top-level scalars.
  for (const k of SCALAR_FIELDS) {
    compareField(k, predicted[k], truth[k], fields);
  }

  // Vendor (nested object).
  compareField("vendor.name", predicted.vendor?.name, truth.vendor?.name, fields);
  compareField("vendor.address", predicted.vendor?.address, truth.vendor?.address, fields);
  compareField("vendor.tax_id", predicted.vendor?.tax_id, truth.vendor?.tax_id, fields);

  // Line items — align by index; extra/missing rows count their cells.
  const liN = Math.max(predicted.line_items?.length ?? 0, truth.line_items?.length ?? 0);
  for (let i = 0; i < liN; i++) {
    const p = predicted.line_items?.[i];
    const t = truth.line_items?.[i];
    for (const k of LINE_ITEM_KEYS) {
      compareField(`line_items[${i}].${k}`, p?.[k] ?? null, t?.[k] ?? null, fields);
    }
  }

  // Tax breakdown — same approach.
  const txN = Math.max(predicted.tax_breakdown?.length ?? 0, truth.tax_breakdown?.length ?? 0);
  for (let i = 0; i < txN; i++) {
    const p = predicted.tax_breakdown?.[i];
    const t = truth.tax_breakdown?.[i];
    for (const k of TAX_KEYS) {
      compareField(`tax_breakdown[${i}].${k}`, p?.[k] ?? null, t?.[k] ?? null, fields);
    }
  }

  const correct = fields.filter((f) => f.status === "match").length;
  const total = fields.length;
  return { fields, correct, total, accuracy: total ? correct / total : 0 };
}
