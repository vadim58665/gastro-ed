---
name: wiki-ingest
description: "Ingest a source document into the wiki. Reads the source, creates summary page, updates entity/concept pages, flags contradictions, updates index and log. Usage: /wiki-ingest wiki/raw/medical/filename.md or /wiki-ingest batch wiki/raw/medical/ for batch processing."
---

# Wiki Ingest

Process a source document into the wiki knowledge base.

## Input

- Single file: `/wiki-ingest wiki/raw/medical/filename.md`
- Batch: `/wiki-ingest batch wiki/raw/medical/`

## Workflow

1. **Read schema**: Read `wiki/schema.md` for all conventions
2. **Read source**: Read the file(s) specified by the user
3. **Read index**: Read `wiki/index.md` to understand existing wiki state

### Single File Mode (default)

4. **Discuss**: Summarize key takeaways to the user. Ask if emphasis or focus is needed
5. **Create source summary**: Write `wiki/[domain]/sources/src-[name].md` with frontmatter and key takeaways
6. **Update wiki pages**: For each entity/concept in the source:
   - Read existing page if it exists
   - Update with new information, or create new page
   - Add `[[cross-references]]` bidirectionally
   - Flag contradictions per schema rules (never delete old claims)
7. **Update index.md**: Add/update entries for all created/modified pages
8. **Update log.md**: Append chronological entry with date, source name, pages created/updated, notes
9. **Report**: List all pages created/updated

### Batch Mode

4. Process each file in the directory sequentially using steps 5-8 above, without discussing each one
5. **Report**: Summary of all files processed, all pages created/updated

## Quality Rules

- Never modify files in `wiki/raw/` -- those are immutable sources
- Always update `index.md` and `log.md` after any changes
- Use Russian for page content, English for frontmatter field names
- Follow file naming from `wiki/schema.md` (kebab-case, `src-` prefix for sources)
- When in doubt about a medical claim, flag it rather than asserting it
