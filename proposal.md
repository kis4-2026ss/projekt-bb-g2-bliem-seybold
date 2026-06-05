# Project Proposal: AI-Powered Invoice-to-JSON Web App

## Summary

This project is a web application that uses AI to automatically read invoices and turn them into structured data. A user uploads an invoice (image or PDF), an AI model extracts the relevant fields, and the app returns a clean JSON object representing the invoice. Crucially, the app lets us **switch between different AI models** for the same invoice so we can compare how they perform — in both **output quality** and **response time**.

## Motivation

Manually entering invoice data is slow and error-prone, and it's a common real-world business problem. Modern AI models can read documents directly, but they differ widely in accuracy, speed, and cost. This project is both a practical tool and an experiment: it builds a working invoice extractor *and* a small framework for objectively comparing AI models on a concrete, measurable task.

## Core features (MVP)

1. **Invoice upload.** A drag-and-drop zone (with click-to-browse and clipboard-paste fallbacks) that accepts PNG, JPG, and PDF files and shows a preview of what was uploaded.
2. **AI extraction to JSON.** The uploaded invoice is sent to an AI model, which returns a structured JSON object containing fields such as vendor, invoice number, dates, line items, subtotal, tax, total, and currency.
3. **Model switching & comparison.** A control to choose which model performs the extraction (e.g. Claude, GPT, and freely accessible / open models). The app records and displays each model's latency and output so results can be compared side by side.

## Nice-to-have

4. **Ground-truth test set.** A small collection of sample invoices with known-correct JSON mappings. When a model runs on a test invoice, its output is automatically scored against the correct answer (field-level accuracy plus a visual diff), giving an objective quality comparison between models.

## Future work

5. **Trainable model.** The architecture will leave room to later train or fine-tune a dedicated model for invoice mapping. The labeled test invoices effectively become the seed of a training dataset, so this is a natural next step rather than a redesign.

## Deliverables

A working, demoable web app covering features 1–3 (with feature 4 as a target), the code, and this documentation. Final tech stack, hosting, model selection, and timeline will be confirmed during the clarification phase.
