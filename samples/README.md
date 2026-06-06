# Test data (sample invoices + ground truth)

This folder is where the project's test data lives. Each test case is a **pair**:

```
samples/
  invoice-acme-01.png     <- the invoice/receipt image (PNG, JPEG, WebP or PDF)
  invoice-acme-01.json    <- the known-correct ("ground truth") extraction
```

The two files **share the same base name**. The image is what we send to a
model; the `.json` is the answer we score the model's output against
(field-by-field accuracy + a visual diff — added in milestone M4).

## How to add your own test invoices

1. Drop the image in this folder, e.g. `samples/billa-receipt-01.jpg`.
2. Add a matching `samples/billa-receipt-01.json` with the correct values,
   following the same shape as `invoice-acme-01.json` (the schema in
   `lib/schema.ts`). Use `null` for fields the document doesn't have.
3. That's it — the test case is picked up automatically.

> Privacy: prefer synthetic invoices or real ones with no sensitive personal
> data, since these files are part of the repo.

## Why this layout

These image/JSON pairs are also the **start of a labelled dataset**. If we later
fine-tune a model for this task, this folder is the training data — no
restructuring needed.

## Regenerating the synthetic samples

`invoice-acme-01.png` was generated with `scripts/gen_samples.py` (Python +
Pillow) so it's reproducible. More synthetic samples will be added there.
