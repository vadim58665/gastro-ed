# LLM Wiki for УмныйВрач - Design Spec

**Date:** 2026-04-11
**Status:** Draft

## Overview

LLM-maintained knowledge base inside the УмныйВрач repository. Two domains: medical content (guidelines, articles, concepts) and project knowledge (architecture decisions, feature plans, user feedback). Claude Code reads, writes, and maintains all wiki pages. The user curates sources, directs analysis, and asks questions.

Based on Andrej Karpathy's LLM Wiki pattern.

## Goals

1. Accumulate medical knowledge from clinical guidelines, articles, textbooks - structured and cross-referenced, not scattered
2. Capture project decisions, feature rationale, and user feedback that isn't derivable from code or git history
3. Use wiki as context for generating УмныйВрач card content and answering medical/project questions
4. Knowledge compounds with every source added, not re-derived on every query

## Directory Structure

```
wiki/
├── medical/
│   ├── entities/         # Diseases, drugs, procedures (h-pylori.md, ipp.md)
│   ├── concepts/         # Topics spanning multiple entities (eradication-therapy.md)
│   └── sources/          # Summaries of ingested medical documents (src-rga-hp-2023.md)
├── project/
│   ├── decisions/        # Architecture and product decisions (fsrs-algorithm.md)
│   ├── features/         # Feature descriptions and plans (medmind-ai.md)
│   └── sources/          # Summaries of ingested project documents (src-feedback-apr.md)
├── raw/
│   ├── medical/          # Immutable source documents (PDF, markdown)
│   └── project/          # Notes, transcripts, feedback documents
├── index.md              # Catalog of all wiki pages with one-line summaries
├── log.md                # Chronological append-only log of all operations
└── schema.md             # Conventions and workflows for wiki maintenance
```

## Page Types and Frontmatter

### Entity (medical or project)

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

Sections: Definition, Diagnosis, Treatment, Contradictions, Related links.

### Concept

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

Sections: Overview, Approaches, Evidence, Related links.

### Source Summary

```yaml
---
title: "РГА: Клинические рекомендации по H. pylori 2023"
type: source
domain: medical
ingested: 2026-04-11
---
```

Sections: Key takeaways, Updated pages list.

### Decision (project)

```yaml
---
title: FSRS Algorithm Choice
type: decision
status: implemented
date: 2026-03-15
---
```

Sections: Decision, Reasoning, Alternatives considered, Related links.

### Feature (project)

```yaml
---
title: MedMind AI
type: feature
status: active
date: 2026-04-01
---
```

Sections: Description, Current state, Plans, Related links.

## File Naming

- kebab-case: `h-pylori.md`, `eradication-therapy.md`
- Source summaries prefixed with `src-`: `src-rga-hp-2023.md`
- No transliteration of well-known terms: `h-pylori` not `khelikobakter`
- Cross-references use `[[page-name]]` syntax (Obsidian-compatible)

## Operations

### Ingest

1. User places file in `wiki/raw/medical/` or `wiki/raw/project/`
2. User tells Claude Code: "ingest wiki/raw/medical/rga-hp-2023.md"
3. Claude Code:
   - Reads the source document
   - Discusses key takeaways with user (manual mode) or processes silently (batch mode)
   - Creates source summary page in appropriate `sources/` directory
   - Creates or updates entity and concept pages across the wiki
   - Flags contradictions with existing pages (does not delete old claims, marks conflicts with both sources cited)
   - Updates `index.md`
   - Appends entry to `log.md`

Batch mode: "ingest everything in wiki/raw/medical/" - processes all, user reviews after.

### Query

1. User asks a question
2. Claude Code reads `index.md` to find relevant pages
3. Reads those pages, synthesizes answer with citations to wiki pages
4. If the answer is valuable, offers to save it as a new wiki page

### Lint

User says "lint wiki". Claude Code checks for:
- Contradictions between pages
- Orphan pages (no inbound links)
- Broken `[[links]]` (mentioned but not created)
- Stale sources (not updated in a long time)
- Missing cross-references

Outputs a report and proposes fixes.

## index.md Format

```markdown
# Wiki Index

## Medical

### Entities
- [H. pylori](medical/entities/h-pylori.md) - gram-negative bacterium, eradication, diagnostics

### Concepts
- [Eradication Therapy](medical/concepts/eradication-therapy.md) - first/second line regimens

### Sources
- [РГА: H. pylori 2023](medical/sources/src-rga-hp-2023.md) - clinical guidelines, 14-day regimens

## Project

### Decisions
- [FSRS Algorithm](project/decisions/fsrs-algorithm.md) - ts-fsrs chosen over SM-2

### Features
- [MedMind AI](project/features/medmind-ai.md) - AI companion, tiers, limits

### Sources
- [User Feedback April](project/sources/src-feedback-apr.md) - beta tester feedback
```

One line per page. Updated on every ingest. Claude Code reads this first when answering queries.

## log.md Format

```markdown
# Wiki Log

## [2026-04-11] ingest | РГА: H. pylori 2023
Source: raw/medical/rga-hp-2023.md
Created: h-pylori.md, eradication-therapy.md, ipp.md
Updated: index.md
Notes: contradiction with Maastricht VI on therapy duration

## [2026-04-11] query | First-line eradication regimens?
Answer saved: medical/concepts/eradication-first-line.md
```

Append-only. Each entry starts with `## [YYYY-MM-DD] operation | title` for grep parseability.

## Schema Integration with CLAUDE.md

Add to CLAUDE.md:

```markdown
## Wiki
- LLM-maintained knowledge base in `wiki/`
- Schema and conventions: `wiki/schema.md`
- Before answering medical or project questions - check wiki/index.md first
- After valuable queries - offer to save answer as wiki page
```

Full rules live in `wiki/schema.md`. CLAUDE.md only points to it.

## .gitignore Additions

```
wiki/raw/**/*.pdf
wiki/raw/**/*.docx
```

Markdown sources and all wiki pages are committed. Binary files are not.

## Scale Considerations

- Expected scale: 30-100 sources over 2-3 months
- At this scale, `index.md` is sufficient for navigation (no search engine needed)
- If wiki grows past ~200 pages, consider adding qmd or a simple grep-based search script
- Obsidian can be pointed at `wiki/` folder at any time for graph view and plugins

## Contradiction Handling

When new source contradicts existing wiki content:
- Do NOT delete the old claim
- Add a "Contradictions" section citing both sources
- Example: "РГА recommends 14-day triple therapy, Maastricht VI allows 10 days (src-rga-hp-2023 vs src-maastricht-vi)"
- User resolves which position the wiki adopts, or both stay documented
