"""Readiness-формула P(pass >= 70% на экзамене из 80 случайных вопросов).

Математика и параметры согласно спеке
`docs/superpowers/specs/2026-04-20-readiness-formula-design.md`.

Все функции чистые, детерминированные при фиксированном `now_ms`, не зависят
от настройки окружения.
"""

from __future__ import annotations

import math
import time
from collections import defaultdict

from app.models.readiness import (
    BlockReport,
    ComputeReadinessRequest,
    QuestionStats,
    ReadinessReport,
)

MS_PER_DAY = 86_400_000.0

BASELINE = 0.25
S_0 = 3.0  # стабильность после первого правильного ответа, дни
BETA = 2.0  # множитель стабильности за каждый следующий правильный ответ

EXAM_DRAW_SIZE = 80
PASS_RATIO = 0.7
MIN_PASS = math.ceil(EXAM_DRAW_SIZE * PASS_RATIO)  # 56

WEAK_THRESHOLD = 0.4

BLOCK_STARTED_COVERAGE_MIN = 0.2
BLOCK_READY_MIN = 0.4
BLOCK_STRONG_MIN = 0.85
BLOCK_STRONG_COVERAGE_MIN = 0.8


def p_correct(stats: QuestionStats | None, now_ms: int) -> float:
    """Вероятность того, что пользователь прямо сейчас ответит на вопрос верно."""
    if stats is None or stats.attempts == 0:
        return BASELINE
    if not stats.last_answer_correct:
        return BASELINE

    days = max(0.0, (now_ms - stats.last_seen_ms) / MS_PER_DAY)
    streak = max(1, stats.correct_streak)
    stability = S_0 * (BETA ** (streak - 1))
    return BASELINE + (1.0 - BASELINE) * math.exp(-days / stability)


def _erf(x: float) -> float:
    """Abramowitz & Stegun 7.1.26, max error ~ 1.5e-7."""
    sign = 1.0 if x >= 0 else -1.0
    ax = abs(x)
    t = 1.0 / (1.0 + 0.3275911 * ax)
    a1, a2, a3, a4, a5 = (
        0.254829592,
        -0.284496736,
        1.421413741,
        -1.453152027,
        1.061405429,
    )
    poly = ((((a5 * t + a4) * t) + a3) * t + a2) * t + a1
    y = 1.0 - poly * t * math.exp(-ax * ax)
    return sign * y


def normal_cdf(z: float) -> float:
    return 0.5 * (1.0 + _erf(z / math.sqrt(2.0)))


def exam_readiness(
    probs: list[float],
    draw_size: int = EXAM_DRAW_SIZE,
    pass_ratio: float = PASS_RATIO,
) -> float:
    """P(sum_of_correct >= ceil(draw_size * pass_ratio)) через CLT."""
    n = len(probs)
    if n == 0:
        return 0.0

    draw = min(draw_size, n)
    min_correct = math.ceil(draw * pass_ratio)

    avg_p = sum(probs) / n
    avg_var = sum(p * (1.0 - p) for p in probs) / n

    mu = draw * avg_p
    sigma2 = draw * avg_var
    if sigma2 <= 0.0:
        return 1.0 if mu >= min_correct else 0.0

    sigma = math.sqrt(sigma2)
    z = (min_correct - 0.5 - mu) / sigma
    return max(0.0, min(1.0, 1.0 - normal_cdf(z)))


def classify_block(avg_p: float, coverage: float) -> str:
    if coverage <= 0.0:
        return "not_started"
    if coverage < BLOCK_STARTED_COVERAGE_MIN:
        return "started"
    if avg_p < BLOCK_READY_MIN:
        return "weak"
    if avg_p >= BLOCK_STRONG_MIN and coverage >= BLOCK_STRONG_COVERAGE_MIN:
        return "strong"
    return "ready"


def compute_readiness(request: ComputeReadinessRequest) -> ReadinessReport:
    now_ms = request.now_ms if request.now_ms is not None else int(time.time() * 1000)

    by_block: dict[int, list[tuple[str, float, bool]]] = defaultdict(list)
    probs_all: list[float] = []
    touched = 0
    weak_ids: list[str] = []

    for q in request.questions:
        p = p_correct(q.stats, now_ms)
        probs_all.append(p)
        had_attempt = q.stats is not None and q.stats.attempts > 0
        if had_attempt:
            touched += 1
        if p < WEAK_THRESHOLD:
            weak_ids.append(q.question_id)
        by_block[q.block_number].append((q.question_id, p, had_attempt))

    total = len(probs_all)
    avg_strength = sum(probs_all) / total if total else 0.0
    coverage = touched / total if total else 0.0
    readiness = exam_readiness(probs_all)

    blocks: list[BlockReport] = []
    blocks_ready = 0
    for block_number in sorted(by_block.keys()):
        rows = by_block[block_number]
        size = len(rows)
        block_avg = sum(p for _, p, _ in rows) / size
        block_touched = sum(1 for _, _, t in rows if t)
        block_coverage = block_touched / size
        level = classify_block(block_avg, block_coverage)
        if level in ("ready", "strong"):
            blocks_ready += 1
        blocks.append(
            BlockReport(
                block_number=block_number,
                level=level,
                average_strength=round(block_avg, 4),
                coverage=round(block_coverage, 4),
                size=size,
                weak_question_ids=[qid for qid, p, _ in rows if p < WEAK_THRESHOLD],
            )
        )

    return ReadinessReport(
        specialty=request.specialty,
        total_questions=total,
        exam_readiness=round(readiness, 4),
        exam_readiness_percent=round(readiness * 100),
        coverage=round(coverage, 4),
        average_strength=round(avg_strength, 4),
        weak_count=len(weak_ids),
        blocks_ready=blocks_ready,
        blocks=blocks,
        computed_at_ms=now_ms,
    )
