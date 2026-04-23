"""Тесты readiness-формулы.

Опорные значения - из таблицы в
`docs/superpowers/specs/2026-04-20-readiness-formula-design.md`.
"""

from __future__ import annotations

import math

import pytest

from app.models.readiness import (
    ComputeReadinessRequest,
    QuestionInput,
    QuestionStats,
)
from app.services.readiness import (
    BASELINE,
    classify_block,
    compute_readiness,
    exam_readiness,
    normal_cdf,
    p_correct,
)

DAY_MS = 86_400_000
NOW = 1_700_000_000_000  # фиксированный момент для детерминизма


def _stats(
    *,
    attempts: int = 0,
    last_answer_correct: bool = False,
    correct_streak: int = 0,
    days_ago: float = 0.0,
    wrong: int = 0,
) -> QuestionStats:
    return QuestionStats(
        attempts=attempts,
        wrong=wrong,
        last_seen_ms=NOW - int(days_ago * DAY_MS),
        was_ever_correct=last_answer_correct,
        last_answer_correct=last_answer_correct,
        correct_streak=correct_streak,
    )


# ---------- p_correct ----------


def test_p_correct_none_returns_baseline():
    assert p_correct(None, NOW) == BASELINE


def test_p_correct_zero_attempts_returns_baseline():
    assert p_correct(_stats(), NOW) == BASELINE


def test_p_correct_last_wrong_returns_baseline():
    s = _stats(attempts=5, last_answer_correct=False, correct_streak=0)
    assert p_correct(s, NOW) == BASELINE


@pytest.mark.parametrize(
    "streak,days,expected",
    [
        (1, 0, 1.00),
        (1, 3, 0.525),
        (1, 7, 0.321),
        (2, 7, 0.482),
        (3, 7, 0.672),
        (3, 14, 0.479),
        (4, 30, 0.467),
        (5, 30, 0.651),
        (5, 60, 0.473),
    ],
)
def test_p_correct_matches_spec_table(streak, days, expected):
    s = _stats(
        attempts=streak,
        last_answer_correct=True,
        correct_streak=streak,
        days_ago=days,
    )
    got = p_correct(s, NOW)
    assert abs(got - expected) < 0.01, f"streak={streak} days={days}: got {got}, want {expected}"


def test_p_correct_monotonic_decay_with_time():
    make = lambda days: p_correct(  # noqa: E731
        _stats(attempts=1, last_answer_correct=True, correct_streak=1, days_ago=days),
        NOW,
    )
    assert make(0) > make(1) > make(3) > make(10) > make(100)


def test_p_correct_never_below_baseline():
    s = _stats(attempts=1, last_answer_correct=True, correct_streak=1, days_ago=10000)
    assert p_correct(s, NOW) >= BASELINE


def test_p_correct_bigger_streak_means_slower_decay():
    at_7_days_streak_1 = p_correct(
        _stats(attempts=1, last_answer_correct=True, correct_streak=1, days_ago=7), NOW
    )
    at_7_days_streak_3 = p_correct(
        _stats(attempts=3, last_answer_correct=True, correct_streak=3, days_ago=7), NOW
    )
    assert at_7_days_streak_3 > at_7_days_streak_1


# ---------- normal_cdf ----------


def test_normal_cdf_symmetric_about_zero():
    assert abs(normal_cdf(0) - 0.5) < 1e-6
    assert abs(normal_cdf(1) - 0.8413) < 1e-3
    assert abs(normal_cdf(-1) - 0.1587) < 1e-3
    assert abs(normal_cdf(1.96) - 0.975) < 1e-3


# ---------- exam_readiness ----------


def test_exam_readiness_empty_probs_zero():
    assert exam_readiness([]) == 0.0


def test_exam_readiness_all_ones_one():
    assert exam_readiness([1.0] * 300) == 1.0


def test_exam_readiness_all_baseline_near_zero():
    # 80 бросков с p=0.25, нужно >=56 правильных - практически 0
    assert exam_readiness([0.25] * 300) < 0.001


def test_exam_readiness_at_pass_threshold_approx_half():
    # При avg_p=0.7 и n=80 ожидаемое ~0.5 (приближение CLT)
    r = exam_readiness([0.7] * 300)
    assert 0.3 < r < 0.7


def test_exam_readiness_all_zeros_is_zero():
    assert exam_readiness([0.0] * 300) == 0.0


def test_exam_readiness_mixed_strong_weak():
    # Половина сильных (p=0.95), половина слабых (p=0.3): avg_p ~ 0.625
    # mu ~= 50, std ~= sqrt(80*0.235) ~= 4.3, нужно 56 - z ~= 1.3 - readiness ~ 10%
    probs = [0.95] * 150 + [0.3] * 150
    r = exam_readiness(probs)
    assert 0.02 < r < 0.25


def test_exam_readiness_matches_binomial_for_uniform_p():
    """При равных p_i CLT-аппроксимация должна совпадать с точным биномиалом."""
    p = 0.8
    n = 80
    # Точный биномиал P(X >= 56) при n=80, p=0.8
    from math import comb

    exact = sum(comb(n, k) * (p**k) * ((1 - p) ** (n - k)) for k in range(56, n + 1))
    approx = exam_readiness([p] * 300)
    assert abs(exact - approx) < 0.02


# ---------- classify_block ----------


def test_classify_block_not_started():
    assert classify_block(avg_p=0.0, coverage=0.0) == "not_started"


def test_classify_block_started():
    assert classify_block(avg_p=0.5, coverage=0.1) == "started"


def test_classify_block_weak():
    assert classify_block(avg_p=0.3, coverage=0.5) == "weak"


def test_classify_block_ready():
    assert classify_block(avg_p=0.6, coverage=0.5) == "ready"
    assert classify_block(avg_p=0.84, coverage=0.9) == "ready"


def test_classify_block_strong_requires_coverage():
    # avg_p достаточно, но coverage < 0.8 - это ready, не strong
    assert classify_block(avg_p=0.9, coverage=0.5) == "ready"


def test_classify_block_strong():
    assert classify_block(avg_p=0.9, coverage=0.9) == "strong"


# ---------- compute_readiness ----------


def _q(qid: str, block: int, stats: QuestionStats | None = None) -> QuestionInput:
    return QuestionInput(question_id=qid, block_number=block, stats=stats)


def test_compute_readiness_empty_progress():
    req = ComputeReadinessRequest(
        specialty="gastroenterologiya",
        questions=[_q(f"q{i}", 1) for i in range(100)],
        now_ms=NOW,
    )
    report = compute_readiness(req)

    assert report.specialty == "gastroenterologiya"
    assert report.total_questions == 100
    assert report.coverage == 0.0
    assert abs(report.average_strength - BASELINE) < 1e-9
    assert report.exam_readiness < 0.001
    assert report.weak_count == 100  # все p=0.25 < 0.4
    assert report.blocks_ready == 0
    assert len(report.blocks) == 1
    assert report.blocks[0].level == "not_started"


def test_compute_readiness_all_perfect_just_answered():
    stats = _stats(attempts=5, last_answer_correct=True, correct_streak=5, days_ago=0)
    req = ComputeReadinessRequest(
        specialty="X",
        questions=[_q(f"q{i}", (i % 4) + 1, stats) for i in range(120)],
        now_ms=NOW,
    )
    report = compute_readiness(req)

    assert report.total_questions == 120
    assert report.coverage == 1.0
    assert report.average_strength > 0.99
    assert report.exam_readiness > 0.99
    assert report.weak_count == 0
    assert report.blocks_ready == 4
    for b in report.blocks:
        assert b.level == "strong"


def test_compute_readiness_blocks_sorted_by_number():
    stats = _stats(attempts=2, last_answer_correct=True, correct_streak=2, days_ago=0)
    req = ComputeReadinessRequest(
        specialty="X",
        questions=[
            _q("a1", 3, stats),
            _q("a2", 1, stats),
            _q("a3", 2, stats),
        ],
        now_ms=NOW,
    )
    report = compute_readiness(req)
    assert [b.block_number for b in report.blocks] == [1, 2, 3]


def test_compute_readiness_weak_ids_listed_per_block():
    ok = _stats(attempts=1, last_answer_correct=True, correct_streak=1, days_ago=0)
    weak = _stats(attempts=1, last_answer_correct=False, correct_streak=0)
    req = ComputeReadinessRequest(
        specialty="X",
        questions=[
            _q("w1", 1, weak),
            _q("ok1", 1, ok),
            _q("w2", 2, weak),
        ],
        now_ms=NOW,
    )
    report = compute_readiness(req)
    block1 = next(b for b in report.blocks if b.block_number == 1)
    assert set(block1.weak_question_ids) == {"w1"}
    block2 = next(b for b in report.blocks if b.block_number == 2)
    assert block2.weak_question_ids == ["w2"]


def test_compute_readiness_uses_current_time_when_not_passed(mocker):
    mocker.patch("app.services.readiness.time.time", return_value=NOW / 1000)
    req = ComputeReadinessRequest(
        specialty="X",
        questions=[_q("q1", 1)],
    )
    report = compute_readiness(req)
    assert report.computed_at_ms == NOW


def test_compute_readiness_percent_rounded_correctly():
    stats = _stats(attempts=2, last_answer_correct=True, correct_streak=2, days_ago=0)
    req = ComputeReadinessRequest(
        specialty="X",
        questions=[_q(f"q{i}", 1, stats) for i in range(120)],
        now_ms=NOW,
    )
    report = compute_readiness(req)
    assert 0 <= report.exam_readiness_percent <= 100
    assert math.isclose(
        report.exam_readiness_percent,
        round(report.exam_readiness * 100),
    )
