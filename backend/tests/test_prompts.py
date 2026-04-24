from app.models.ai import ContentType
from app.services.prompts import (
    HAIKU,
    SONNET,
    SYSTEM_PROMPTS,
    estimate_cost_usd,
    max_tokens_for,
    model_for,
)


def test_all_content_types_have_system_prompt():
    for ct in ContentType:
        assert ct in SYSTEM_PROMPTS
        assert len(SYSTEM_PROMPTS[ct]) > 200


def test_model_for_hint_is_haiku():
    assert model_for(ContentType.HINT) == HAIKU
    assert "haiku" in HAIKU.lower()


def test_model_for_explain_is_sonnet():
    assert model_for(ContentType.EXPLAIN_SHORT) == SONNET
    assert model_for(ContentType.EXPLAIN_LONG) == SONNET


def test_max_tokens_ordered_by_content_type():
    assert max_tokens_for(ContentType.HINT) < max_tokens_for(ContentType.EXPLAIN_SHORT)
    assert max_tokens_for(ContentType.EXPLAIN_SHORT) < max_tokens_for(ContentType.EXPLAIN_LONG)


def test_cost_sonnet_input_only():
    assert estimate_cost_usd(SONNET, 1_000_000, 0) == 3.0


def test_cost_sonnet_output_only():
    assert estimate_cost_usd(SONNET, 0, 1_000_000) == 15.0


def test_cost_haiku_mixed():
    assert estimate_cost_usd(HAIKU, 1_000_000, 1_000_000) == 6.0


def test_cost_unknown_model_is_zero():
    assert estimate_cost_usd("claude-nonexistent", 1000, 1000) == 0.0


def test_ebm_base_present_in_every_system_prompt():
    key_phrase = "Клинические рекомендации Минздрава"
    for ct in ContentType:
        assert key_phrase in SYSTEM_PROMPTS[ct], f"missing EBM guidance in {ct.value}"


def test_hint_prompt_forbids_direct_answer():
    text = SYSTEM_PROMPTS[ContentType.HINT]
    assert "НЕ называй правильный ответ" in text
