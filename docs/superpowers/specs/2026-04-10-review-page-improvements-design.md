# Review Page Improvements - Design Spec

## Overview

Upgrade the "Ошибки" (Review) page from a minimal card-by-card flow into a rich review experience with session tracking, per-card context, topic filtering, and informative empty/completion states. Single-page architecture (variant A): all improvements live on one page with state transitions.

## Architecture: Single Page, Three States

The page has three states based on data:

1. **Session** - when due cards exist and user is reviewing
2. **Summary** - when user has completed all due cards in the session
3. **Empty** - when no cards are due (nothing to review right now)

### State machine

```
[Empty] --cards become due--> [Session]
[Session] --all cards answered--> [Summary]
[Summary] --user dismisses / navigates away--> [Empty]
```

## State 1: Session (reviewing cards)

### Progress bar
- Thin 3px bar at top of content area (below TopBar)
- Label: "ПОВТОРЕНИЕ" left, "3 из 8" right
- Fill: primary gradient `#6366f1` to `#818cf8`
- Updates after each card advance

### Topic filter chips
- Horizontal scrollable row below progress bar
- "Все (N)" chip active by default (primary style)
- One chip per topic present in due cards, with count
- Clicking a chip filters the session to that topic only
- Chip style: `bg-primary/15 text-primary` active, `bg-surface text-muted` inactive

### Per-card context badges
- Shown between topic label and card content
- Data from FSRS card state + `useProgress` card history:
  - **Consecutive fails badge**: "N ошибок подряд" (danger style) - from `cardHistory[id].consecutiveFails`
  - **Repetition count**: "Повтор #N" - from `fsrs.reps`
  - **Difficulty indicator**: "Сложность: высокая/средняя/низкая" - from `fsrs.difficulty` (>7 high, >4 medium, else low)
- Shown as small text below the card, centered, muted color

### Card rendering
- Same as current: `CardRenderer` with `key={card.id}` for state reset
- Same answer flow: `onAnswer(isCorrect)` -> show next button
- Next button behavior unchanged

## State 2: Summary (session complete)

Shown when `currentIndex >= dueCards.length` and at least one card was answered.

### Session results stored in component state

```typescript
interface SessionResult {
  correct: number;
  wrong: number;
  cards: { cardId: string; isCorrect: boolean }[];
}
```

Track during session, display on summary.

### Layout (top to bottom)

1. **Accuracy percentage** - large `font-extralight` number in success/danger color
   - Green (`text-success`) if >= 70%
   - Red (`text-danger`) if < 70%
   - Below: "N из M правильно"

2. **Thin divider** - `w-12 h-px bg-border mx-auto`

3. **Stats row** - three numbers centered:
   - Correct (success color)
   - Wrong (danger color)
   - Mastered total (foreground) - cards with FSRS state "Review" and stability > 10

4. **Problem cards list** - only if there were wrong answers:
   - Header: "ПРОБЛЕМНЫЕ КАРТОЧКИ"
   - Each card: topic + card identifier, error count badge
   - Background: `bg-danger/8`, rounded

5. **Next review time** - when is the earliest `due` date among all review cards:
   - "СЛЕДУЮЩИЙ ПОВТОР"
   - Relative time: "через 2 часа", "через 1 день", "завтра"
   - `bg-surface` rounded container

## State 3: Empty (no due cards)

Replace the current static "0" with useful information.

### Layout (top to bottom)

1. **Next review countdown** - large number showing time until next card is due:
   - Format: "4ч 12м" or "1д 3ч" or "23м"
   - If no cards in review at all: show current "0" style with explanation text (unchanged)

2. **Thin divider**

3. **Mini stats row** - three numbers:
   - Mastered (success) - FSRS state "Review", stability > 10
   - Learning (warning) - FSRS state "Learning" or "Relearning"
   - Problem (danger) - cards with `consecutiveFails >= 3` in cardHistory

4. **List toggle button** - "Все карточки на повторении (N)"
   - Opens an expandable list of all review cards
   - Each card shows: topic, card snippet, FSRS state badge (New/Learning/Review), next due date
   - Sorted by due date ascending

## Data Requirements

### From `useReview` (already available)
- `reviewCards` - all review cards with FSRS state
- `getDueCards(source)` - due card IDs filtered by mode
- `getDueCount(source)` - due count

### New: expose from `useReview`
- `getNextDueDate(source?: ReviewSource): Date | null` - earliest due date among non-due cards
- `getCardStats(source?: ReviewSource)` - returns `{ mastered: number, learning: number, problem: number, total: number }`
- `getReviewCard(cardId: string): ReviewCard | undefined` - get single card's FSRS data

### From `useProgress` (already available)
- `progress.cardHistory[cardId]` - attempts, correct, consecutiveFails

## Files to modify

1. **`src/hooks/useReview.ts`** - add `getNextDueDate`, `getCardStats`, `getReviewCard`
2. **`src/app/review/page.tsx`** - complete rewrite with three states, session tracking, all new UI
3. No new components needed - everything fits in the page file

## Design tokens

All styling uses existing theme variables:
- Colors: `text-foreground`, `text-muted`, `text-success`, `text-danger`, `text-warning`, `text-primary`, `bg-surface`, `bg-danger/8`, `bg-primary/15`
- Typography: `font-extralight` for large numbers, `text-xs uppercase tracking-[0.2em] font-semibold` for labels
- Spacing: consistent with luxury minimalism (generous padding, thin dividers)

## Out of scope
- Persistent session history across page reloads (session state is ephemeral)
- Separate list view page (list is inline expandable)
- Calendar/schedule visualization
- Skip card functionality
