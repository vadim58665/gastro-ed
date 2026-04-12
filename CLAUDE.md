@AGENTS.md

# УмныйВрач — Project Conventions

## Architecture
- Next.js 16 App Router + TypeScript + Tailwind CSS v4
- All pages are `"use client"` (localStorage-dependent)
- 7 card types defined in `src/types/card.ts`
- Card data in `src/data/cards.ts` (static, no DB yet)
- Hooks: `useProgress` (streak/points), `useReview` (FSRS spaced repetition)
- Both hooks persist to localStorage

## Design
- Luxury minimalism (reference: johannis.it)
- Large font-extralight numbers, uppercase tracking-wide labels, thin dividers
- No decorative icons or emojis on pages (SVG only in BottomNav)
- Theme colors defined in `globals.css` @theme block

## Code Style
- Russian UI text, English code
- No emojis in UI (user explicitly rejected them)
- Card components take `{ card, onAnswer }` props
- `onAnswer(isCorrect: boolean)` callback pattern

## Build
- `turbopack.root: "."` required (Cyrillic path workaround)
- `useSearchParams()` must be wrapped in `<Suspense>`

## Spec
- Full product specification in `SPEC.md`

## Wiki
- LLM-maintained knowledge base in `wiki/`
- Schema and conventions: `wiki/schema.md`
- Before answering medical or project questions, check `wiki/index.md` first
- After valuable queries, offer to save answer as wiki page
- Operations: ingest (add source), query (ask questions), lint (health-check)
