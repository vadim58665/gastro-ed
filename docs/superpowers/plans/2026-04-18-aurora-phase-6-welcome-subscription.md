# Aurora Redesign - Phase 6 Implementation Plan (/welcome + /subscription)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** перевести конверсионные страницы на aurora. `/welcome` - публичный auth (email+OTP). `/subscription` - tier-карточки с переработкой палитры (убрать emerald/amber из `accred_tutor`/`accred_extreme`).

**Architecture:** рефактор 2 page.tsx файлов. Новых примитивов нет. Используем существующие: `btn-premium-dark`, `aurora-text`, `ShineCard`, `divider-soft`, `input-refined`. Логика (auth-flow, subscription hooks, yookassa) НЕ меняется.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, vitest.

**Ветка:** `feat/aurora-phase-6` (уже создана, основа `feat/aurora-phase-5`).

---

## Правила

- Нет em-dash `—`, только `-`. Нет emoji. `"use client"`. Русский UI, английский код.
- **ВСЕ цвета через CSS vars** - никаких `#6366f1`, `#10b981`, `#f59e0b`, `#ec4899` в новом коде.
- CSS vars (доступны): `var(--color-aurora-indigo/violet/pink/ink)`, `var(--aurora-indigo-soft)`, `var(--aurora-violet-soft)`, `var(--aurora-pink-soft)`, `var(--aurora-*-border)`, `var(--aurora-gradient-primary)`, `var(--aurora-gradient-premium)`.

---

## Task 1: Рефактор `src/app/welcome/page.tsx`

**Файлы:**
- Modify: `src/app/welcome/page.tsx`

**Цель:** aurora-акценты на лендинге-auth. Envelope icon box в aurora-violet-soft, primary → aurora, rose-500 → aurora-pink, btn-raised-dark → btn-premium-dark, spinner → aurora-indigo.

### Изменения

**Spinner (loading state, строка 131-135):**
```tsx
<div className="min-h-screen flex items-center justify-center bg-background">
  <div
    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
    style={{ borderColor: "var(--color-aurora-indigo)", borderTopColor: "transparent" }}
  />
</div>
```

**Envelope icon box (sent state, строки 162-166):**
- `bg-primary-light` → inline style `background: "var(--aurora-violet-soft)"`
- svg stroke `text-primary` → inline `style={{ color: "var(--color-aurora-violet)" }}`

**OTP input focus-ring (строки 177-188):**
- Keep `input-refined` if it uses primary (which is aurora-indigo). Check - probably OK.
- Actually simpler: `focus:ring-primary/30 focus:border-primary` → aurora via inline styles not feasible on focus:; instead replace `focus:ring-primary/30 focus:border-primary` with aurora via CSS custom class.

**Вместо inline** - добавить в globals.css небольшой класс `.aurora-otp-cell`:
```css
.aurora-otp-cell {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.aurora-otp-cell:focus {
  outline: none;
  border-color: var(--color-aurora-indigo);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-aurora-indigo) 30%, transparent);
}
```

Добавить в globals.css в блок Phase 6 (после aurora-blitz, перед media query, перед `html[data-theme="mocha"]`).

Применить к `<input>`:
```tsx
className="aurora-otp-cell w-11 h-14 rounded-xl border border-border bg-card text-center text-xl font-light text-foreground disabled:opacity-50"
```

**Error text (строки 192-194, 231-233):** `text-rose-500` → inline `style={{ color: "var(--color-aurora-pink)" }}`:
```tsx
{error && (
  <p
    className="text-xs font-medium mb-4"
    style={{ color: "var(--color-aurora-pink)" }}
  >{error}</p>
)}
```

**Submitting spinner (строки 196-200):** `border-primary` → inline aurora-indigo.

**"Отправить снова" / "Другой email" links (строки 203-216):** `hover:text-primary` → keep current классы (они через CSS var primary, которая indigo - theme-adaptive).

**Primary CTA submit (строка 235-241):** `btn-raised-dark` → `btn-premium-dark`:
```tsx
<button
  type="submit"
  disabled={submitting || !email}
  className="btn-premium-dark w-full py-3.5 rounded-2xl text-sm font-medium tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
>
  {submitting ? "Отправка..." : "Получить код"}
</button>
```

(text-white уже в btn-premium-dark, убираем `text-white`.)

### Verification

`cd /Users/vadim/Desktop/проекты/gastro-ed && npm test -- --run` → 475 passed. `npm run build` → success.

### Commit

```
git add src/app/welcome/page.tsx src/app/globals.css
git commit -m "$(cat <<'EOF'
refactor(welcome): /welcome - aurora через CSS vars

Envelope icon box - aurora-violet-soft, stroke в var(--color-aurora-violet).
Error text - var(--color-aurora-pink) вместо text-rose-500. Primary CTA
через .btn-premium-dark вместо btn-raised-dark. Spinner-кольца в
var(--color-aurora-indigo). Новый CSS-класс .aurora-otp-cell для
focus-состояния инпутов кода (theme-adaptive). Логика auth-flow
не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Рефактор `src/app/subscription/page.tsx` - aurora tier palette

**Файлы:**
- Modify: `src/app/subscription/page.tsx`

**Цель:** убрать emerald (`#10b981`) и amber (`#f59e0b`) из `TIER_PALETTE`. `accred_tutor` становится indigo→pink, `accred_extreme` - premium-dark (ink→indigo-deep). Все hex через CSS vars.

### Изменения

**TIER_PALETTE (строки 9-16):** переписать под vars. Поскольку в inline styles (gradient, shadow) CSS var можно использовать только через `style={{}}`, но не во время построения `linear-gradient`-string, трансформируем подход:

Вместо объекта с `from`/`to`/`grad` используем `tierPaletteCSS(tier): React.CSSProperties` или храним aurora-ключи, которые резолвятся при рендере через getComputedStyle? Нет, проще: сохраняем `from`/`to` как CSS var name, резолвим в инlinestyle через `background: \`linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))\``.

Новый TIER_PALETTE:
```ts
type TierPalette = { from: string; to: string; isDark?: boolean };
const TIER_PALETTE: Record<SubscriptionTier, TierPalette> = {
  free: { from: "var(--color-muted, #94a3b8)", to: "var(--color-border, #cbd5e1)" },
  feed_helper: { from: "var(--color-aurora-indigo)", to: "var(--color-aurora-violet)" },
  accred_basic: { from: "var(--color-aurora-indigo)", to: "var(--color-aurora-violet)" },
  accred_mentor: { from: "var(--color-aurora-violet)", to: "var(--color-aurora-pink)" },
  accred_tutor: { from: "var(--color-aurora-indigo)", to: "var(--color-aurora-pink)" },
  accred_extreme: { from: "var(--color-ink)", to: "var(--color-aurora-indigo)", isDark: true },
};
```

Удалить неиспользуемое поле `grad` (классов `tier-grad-*` в CSS нет).

**ShineCard invocation (строки 155-161):** `colorFrom/colorTo` принимают строки - `var(--...)` работает, потому что ShineCard вставляет в CSS gradient через style. Если ShineCard ожидает только hex (проверить его реализацию) - передавать hex fallback. **Action:** прочитать `src/components/ui/ShineCard.tsx` и убедиться что `colorFrom/colorTo` совместимы с CSS var-строками. Если нужна совместимость hex - добавим conversion-функцию или передадим resolved hex через getComputedStyle hack.

Скорее всего ShineCard принимает colorFrom/colorTo как string и вставляет в `background: linear-gradient(..., ${colorFrom}, ${colorTo})`. CSS vars отлично работают.

**Dot features list (строки 186-197):** `linear-gradient(135deg, ${palette.from}, ${palette.to})` - подставляются уже var-строки, сгенерированный `linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))` - работает.

**Box-shadow на dot (строка 193):** `boxShadow: \`0 0 8px ${palette.from}\`` - с var это `0 0 8px var(--color-aurora-indigo)` - работает в современных браузерах (CSS vars в box-shadow color).

**Active subscription card (isPro branch, строки 63-97):**
- `text-primary` на price (строка 73) - остаётся (текущий primary это aurora-indigo, theme-adaptive через `--color-primary`).
- `text-primary` на checkmark svg (строка 86) - остаётся.

**"3 дня бесплатно" trial link (строка 216-220):** `text-primary/70 hover:text-primary` - остаётся (primary = aurora-indigo).

**Segmented control (toggle) (строки 118-146):** inline styles с hex `#eef0f7`, `#f5f6fa` - заменить на var-based:
```tsx
style={{
  backgroundImage: "linear-gradient(180deg, var(--color-surface, #eef0f7) 0%, var(--color-background, #f5f6fa) 100%)",
  boxShadow: "inset 0 1px 2px rgba(17,24,39,0.06), inset 0 0 0 1px rgba(17,24,39,0.05)",
}}
```

### Verification

`npm test -- --run` → 475 passed (feedProfile.test.tsx - проверить, не сломались ли tier-related тесты).

`npm run build` → success.

### Commit

```
git add src/app/subscription/page.tsx
git commit -m "$(cat <<'EOF'
refactor(subscription): aurora tier palette - убрать emerald/amber

TIER_PALETTE переведена на CSS vars. accred_tutor: amber→pink стал
indigo→pink. accred_extreme: emerald→indigo стал ink→indigo
(premium-dark tier). feed_helper/accred_basic/accred_mentor - без
изменений семантики, только var-ссылки. Segmented control
tabactivation-toggle на CSS vars для theme-adaptivity. Логика
subscription (yookassa, hooks) не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Push + PR

```bash
git push -u origin feat/aurora-phase-6
gh pr create --base feat/aurora-phase-5 \
  --title "feat(welcome+sub): Aurora redesign Phase 6 - /welcome + /subscription" \
  --body "..."
```

---

## Self-Review

**Spec coverage (per rustling-squishing-sunbeam Phase 6):**
- ✅ /welcome aurora-hero + feature cards - Task 1 (aurora-violet icon, btn-premium-dark)
- ✅ /subscription - accred_tutor amber→indigo/pink - Task 2
- ✅ /subscription - accred_extreme emerald→premium-dark - Task 2

**Out of scope:**
- Welcome - "Начать бесплатно" CTA и большой лендинг - /welcome сейчас в режиме auth (OTP flow), отдельной маркетинг-секции нет. Она возможно позже.
- Subscription - tier-data в `src/types/medmind.ts` (TIER_CONFIGS) - не трогаем, только палитра.

**Риски:**
- `ShineCard` может иметь ограничения на CSS vars в `colorFrom/colorTo` (если там JS-logic конкатенации). Проверить при реализации. Если не работает - сделать wrapper-функцию, которая резолвит var через `getComputedStyle(document.documentElement).getPropertyValue('--color-aurora-indigo')` при рендере. Но это будет не-reactive при смене темы - лучше обойтись CSS vars прямо.
- `active` subscription блок (isPro) - сейчас text-primary для цены; правки не требуются т.к. primary = aurora-indigo.
