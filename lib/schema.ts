import { z } from "zod";

/**
 * The structured shape we extract from an invoice or shop receipt.
 *
 * Design note: almost everything is nullable. A formal invoice has a vendor
 * tax id, invoice number and due date; a Billa/Spar receipt usually has none
 * of those. Rather than two schemas, we use one where missing fields are null.
 * `tax_breakdown` is an array so several VAT rates (e.g. 10% + 20%) are kept
 * separately, which Austrian/German receipts commonly need.
 */

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  amount: z.number().nullable(),
});

export const TaxLineSchema = z.object({
  /** Tax rate in percent, e.g. 20 for 20%. */
  rate: z.number().nullable(),
  /** Net amount this rate applies to. */
  base: z.number().nullable(),
  /** Tax amount for this rate. */
  amount: z.number().nullable(),
});

export const VendorSchema = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
  tax_id: z.string().nullable(),
});

export const InvoiceSchema = z.object({
  /** "invoice" for formal invoices, "receipt" for shop till receipts. */
  document_type: z.enum(["invoice", "receipt"]).nullable(),
  vendor: VendorSchema,
  invoice_number: z.string().nullable(),
  /** ISO date (YYYY-MM-DD); convert from DD.MM.YYYY etc. */
  issue_date: z.string().nullable(),
  due_date: z.string().nullable(),
  /** ISO 4217 code, e.g. "EUR". */
  currency: z.string().nullable(),
  line_items: z.array(LineItemSchema),
  subtotal: z.number().nullable(),
  tax_breakdown: z.array(TaxLineSchema),
  tax_total: z.number().nullable(),
  total: z.number().nullable(),
  /** Anything notable the model wants to flag; otherwise null. */
  notes: z.string().nullable(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
export type TaxLine = z.infer<typeof TaxLineSchema>;

/**
 * The instruction sent to every model. Kept here (next to the schema) so the
 * prompt and the validation never drift apart. We describe the shape in words
 * and ask for raw JSON; each provider also gets a JSON-only output hint.
 */
export const EXTRACTION_PROMPT = `You are an precise invoice and receipt data extractor.
Extract the data from the provided document image into a single JSON object with EXACTLY this shape:

{
  "document_type": "invoice" | "receipt" | null,
  "vendor": { "name": string|null, "address": string|null, "tax_id": string|null },
  "invoice_number": string|null,
  "issue_date": string|null,   // ISO format YYYY-MM-DD
  "due_date": string|null,     // ISO format YYYY-MM-DD
  "currency": string|null,     // ISO 4217, e.g. "EUR"
  "line_items": [ { "description": string, "quantity": number|null, "unit_price": number|null, "amount": number|null } ],
  "subtotal": number|null,
  "tax_breakdown": [ { "rate": number|null, "base": number|null, "amount": number|null } ],
  "tax_total": number|null,
  "total": number|null,
  "notes": string|null
}

Rules:
- Use null for any field that is not present on the document. Do not invent values.
- Numbers must be plain JSON numbers: no currency symbols, no thousands separators, use a dot as the decimal point.
- Convert all dates to ISO format YYYY-MM-DD.
- "rate" is a percentage as a number (20 means 20%).
- If it is a shop till receipt, set document_type to "receipt" (invoice_number/due_date are usually null).
- Respond with ONLY the JSON object, no markdown, no explanation.`;
