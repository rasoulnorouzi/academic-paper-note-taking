# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Paper Notes — a client-only React + Vite + TypeScript app that batch-summarizes academic papers (PDF/TXT/MD) into structured notes and exports one combined markdown file. Two user-selectable LLM providers: DeepSeek (V4 Pro/Flash, OpenAI-compatible API called via fetch) and Google Gemini (via `@google/genai`). The user enters the API key in the UI; an optional checkbox persists it to localStorage. No server, no env-injected keys — the site deploys as static files to GitHub Pages.

`scholarlens/` is a local, gitignored AI Studio prototype that this app replaced. Never commit or push it.

## Commands

```bash
npm run dev      # Vite dev server on port 3000
npm run build    # tsc --noEmit && vite build
npm run preview  # serve the production build (tests the GitHub Pages base path)
npm run smoke    # live API smoke test: DEEPSEEK_API_KEY=... GEMINI_API_KEY=... npm run smoke [-- deepseek|gemini]
npm run deploy   # build + push dist/ to the gh-pages branch (gh-pages package)
```

There is no test framework; `scripts/smoke.ts` is the only test and it calls the real provider APIs with keys from env vars.

## Architecture

Flat layout: everything is in `src/`, one file per responsibility, no nested folders.

- [src/schema.ts](src/schema.ts) — single source of truth for extraction. A `FIELDS` array (key, kind, description) defines every summary field; the field descriptions carry explicit anti-redundancy exclusion clauses ("Do NOT restate..."). Both provider request formats derive from it: `geminiResponseSchema()` (structured output) and `deepseekSchemaText()` (schema-as-prompt for DeepSeek JSON mode — must keep the word "json" in it). Changing a summary field means changing `FIELDS`, the `PaperSummary` interface in types.ts, and the section list in export.ts/SummaryView.tsx.
- [src/providers.ts](src/providers.ts) — `analyze(provider, model, apiKey, text, filename)`. Pure module (no React/DOM) because [scripts/smoke.ts](scripts/smoke.ts) imports it under Node. DeepSeek: fetch to `https://api.deepseek.com/chat/completions` with `response_format: json_object` (CORS-verified for browser use). Gemini: `@google/genai` client constructed per call with the user's key.
- [src/extract.ts](src/extract.ts) — browser-only PDF/text extraction (pdfjs-dist with the worker bundled via `new URL(..., import.meta.url)` so it works under the Pages base path). Guards: <500 chars → scanned-PDF error; >150k chars → head+tail truncation with a marker. Both providers receive extracted text only; PDFs are never sent as bytes.
- [src/App.tsx](src/App.tsx) — all state; phases `setup → working → results`. The batch loop is sequential and continues past per-paper failures (per-job status + retry).
- [src/export.ts](src/export.ts), [src/SummaryView.tsx](src/SummaryView.tsx), [src/storage.ts](src/storage.ts), [src/types.ts](src/types.ts) (model ID lists live here), [src/styles.css](src/styles.css) (entire design, plain CSS — no Tailwind).

## Conventions

- Keep code simple, flat, and traceable — no new abstractions, folders, or frameworks without need.
- All user-facing strings and README prose follow ASD-STE100 Simplified Technical English: short sentences, active voice, one instruction per sentence.
- Visual style is deliberately plain/academic: system fonts (Georgia headings), palette `#faf9f6`/`#1a1a1a`/accent `#2c4a63`, hairline borders, no gradients/emoji/icons.
- API keys and tokens must never appear in code, vite config `define`, or committed files.

## Deployment

GitHub Pages from the `gh-pages` branch at https://rasoulnorouzi.github.io/academic-paper-note-taking/. `vite.config.ts` sets `base: '/academic-paper-note-taking/'` — keep it in sync with the repo name.
