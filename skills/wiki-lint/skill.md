---
name: wiki-lint
description: "Health-check the wiki. Finds contradictions, orphan pages, broken links, stale sources, missing cross-references. Outputs a grouped report and proposes fixes. Usage: /wiki-lint"
---

# Wiki Lint

Run a health check on the wiki and report issues.

## Workflow

1. **Read schema**: Read `wiki/schema.md` for conventions
2. **Read index**: Read `wiki/index.md` for the page catalog
3. **Scan all pages**: Read every `.md` file in `wiki/medical/` and `wiki/project/`
4. **Check for issues**:

### Errors (must fix)
- **Broken links**: `[[page-name]]` where `page-name.md` does not exist in any wiki directory
- **Missing frontmatter**: Pages without required YAML frontmatter fields (title, type, updated)
- **Empty pages**: Pages with frontmatter but no content sections

### Warnings (should fix)
- **Contradictions**: Different pages making conflicting claims about the same topic without a "Противоречия" section
- **Orphan pages**: Pages with zero inbound `[[links]]` from other pages
- **Stale sources**: Source summary pages where `ingested` date is 90+ days ago and related entity/concept pages have not been updated since
- **One-directional links**: Page A links to page B, but page B does not link back to page A

### Suggestions (nice to fix)
- **Missing pages**: Entity or concept names mentioned in text but not wrapped in `[[links]]`
- **Thin pages**: Pages with only 1-2 sentences of content
- **Unlinked sources**: Entity/concept pages whose `sources` frontmatter list references a source summary that does not exist

5. **Output report**: Group findings by severity (Errors, Warnings, Suggestions). For each issue, state:
   - File path
   - Issue description
   - Proposed fix

6. **Offer to fix**: "Исправить все ошибки и предупреждения?" If user agrees, apply fixes and update `log.md`.
