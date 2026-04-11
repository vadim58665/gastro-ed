---
title: Wiki Schema
description: Conventions and workflows for LLM-maintained wiki
---

# GastroEd Wiki Schema

This wiki is maintained by Claude Code. The user curates sources and asks questions. Claude Code reads, writes, and maintains all pages.

## Directory Structure

- `medical/entities/` -- diseases, drugs, procedures, organisms
- `medical/concepts/` -- topics spanning multiple entities (therapy approaches, diagnostic strategies)
- `medical/sources/` -- one summary page per ingested medical document
- `project/decisions/` -- architecture and product decisions with rationale
- `project/features/` -- feature descriptions, current state, plans
- `project/sources/` -- one summary page per ingested project document
- `raw/medical/` -- immutable source documents (user adds, LLM never modifies)
- `raw/project/` -- immutable project source documents

## File Naming

- kebab-case: `h-pylori.md`, `eradication-therapy.md`, `fsrs-algorithm.md`
- Source summaries prefixed with `src-`: `src-rga-hp-2023.md`, `src-user-feedback-apr.md`
- Use established medical terms, not transliteration: `h-pylori` not `khelikobakter`

## Cross-References

Use `[[page-name]]` syntax for links between wiki pages:
- `[[h-pylori]]` links to `h-pylori.md` (Obsidian-compatible)
- Always add links bidirectionally: if A references B, B should reference A

## Page Frontmatter

Every wiki page starts with YAML frontmatter.

### Entity (medical)

```yaml
---
title: H. pylori
type: entity
specialty: Гастроэнтерология
tags: [инфекция, эрадикация, ИПП]
sources: [src-rga-hp-2023, src-maastricht-vi]
updated: 2026-04-11
---
```

Sections: Определение, Диагностика, Лечение, Противоречия, Связанные страницы.

### Concept (medical)

```yaml
---
title: Эрадикационная терапия
type: concept
specialty: Гастроэнтерология
tags: [H. pylori, антибиотики, ИПП]
sources: [src-rga-hp-2023]
updated: 2026-04-11
---
```

Sections: Обзор, Подходы, Доказательная база, Связанные страницы.

### Source Summary

```yaml
---
title: "РГА: Клинические рекомендации по H. pylori 2023"
type: source
domain: medical
ingested: 2026-04-11
---
```

Sections: Ключевые тезисы, Обновлённые страницы.

### Decision (project)

```yaml
---
title: FSRS Algorithm Choice
type: decision
status: implemented
date: 2026-03-15
---
```

Sections: Решение, Причина, Рассмотренные альтернативы, Связанные страницы.

### Feature (project)

```yaml
---
title: MedMind AI
type: feature
status: active
date: 2026-04-01
---
```

Sections: Описание, Текущее состояние, Планы, Связанные страницы.

## Operations

### Ingest

Triggered by user: "ingest wiki/raw/medical/filename.md" or via `/wiki-ingest` skill.

1. Read the source document in `raw/`
2. In manual mode: discuss key takeaways with the user before proceeding
3. In batch mode: process silently, user reviews after
4. Create a source summary page in the appropriate `sources/` directory
5. For each entity or concept mentioned:
   - If page exists: update it with new information, add source to frontmatter `sources` list
   - If page does not exist: create it
6. Flag contradictions: do NOT delete old claims. Add a "Противоречия" section citing both sources
7. Update `index.md`: add new pages, update summaries of modified pages
8. Append entry to `log.md`

### Query

When the user asks a medical or project question:

1. Read `index.md` to identify relevant pages
2. Read those pages
3. Synthesize answer with citations: "Согласно [[page-name]], ..."
4. If the answer represents a valuable synthesis, offer to save it as a new wiki page

### Lint

Triggered by user: "lint wiki" or via `/wiki-lint` skill.

1. Read all wiki pages
2. Check for:
   - Contradictions between pages
   - Orphan pages (no inbound `[[links]]`)
   - Broken `[[links]]` (referenced page does not exist)
   - Stale sources (not updated in 90+ days)
   - Missing cross-references (entity mentioned in text but not linked)
   - Pages with empty sections
3. Output a report grouped by severity (errors, warnings, suggestions)
4. Propose specific fixes for each issue

## Contradiction Handling

When new source contradicts existing wiki content:
- Do NOT delete the old claim
- Add a "Противоречия" section citing both sources with dates
- Example: "РГА рекомендует 14-дневную тройную терапию, Maastricht VI допускает 10 дней (src-rga-hp-2023 vs src-maastricht-vi)"
- User resolves which position the wiki adopts, or both stay documented

## Content Language

- Page content in Russian (matching GastroEd UI language)
- Frontmatter field names in English (type, specialty, tags, sources, updated)
- Medical terms: use accepted Russian terminology, Latin terms where standard (H. pylori, C. difficile)
