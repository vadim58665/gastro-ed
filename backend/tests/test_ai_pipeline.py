from unittest.mock import AsyncMock, MagicMock

from app.models.ai import ContentType, EntityType, GenerationRequest, GenerationResult
from app.workers.ai_pipeline import generate_batch_job


def _payload_item(entity_id: str = "c1") -> dict:
    return {
        "entity_type": EntityType.CARD.value,
        "entity_id": entity_id,
        "content_type": ContentType.HINT.value,
        "prompt": "достаточно длинный промпт для валидатора",
    }


def _result(entity_id: str = "c1") -> GenerationResult:
    return GenerationResult(
        entity_type=EntityType.CARD,
        entity_id=entity_id,
        content_type=ContentType.HINT,
        content_ru=f"text-{entity_id}",
        model_used="claude-haiku-4-5-20251001",
        tokens_used=30,
        cost_usd=0.0001,
    )


def test_generate_batch_job_success(mocker):
    async def fake_generate(req: GenerationRequest) -> GenerationResult:
        return _result(req.entity_id)

    fake_client = MagicMock()
    fake_client.generate = AsyncMock(side_effect=fake_generate)
    mocker.patch("app.workers.ai_pipeline.AIClient.create", return_value=fake_client)
    mocker.patch("app.workers.ai_pipeline.upsert_results", return_value=2)

    summary = generate_batch_job([_payload_item("c1"), _payload_item("c2")])

    assert summary["requested"] == 2
    assert summary["generated"] == 2
    assert summary["stored"] == 2
    assert summary["failed"] == 0
    assert summary["cost_usd"] > 0
    assert summary["errors"] == []


def test_generate_batch_job_partial_failure(mocker):
    async def fake_generate(req: GenerationRequest) -> GenerationResult:
        if req.entity_id == "bad":
            raise RuntimeError("api exploded")
        return _result(req.entity_id)

    fake_client = MagicMock()
    fake_client.generate = AsyncMock(side_effect=fake_generate)
    mocker.patch("app.workers.ai_pipeline.AIClient.create", return_value=fake_client)

    upsert_mock = mocker.patch("app.workers.ai_pipeline.upsert_results", return_value=1)

    summary = generate_batch_job([_payload_item("c1"), _payload_item("bad")])

    assert summary["requested"] == 2
    assert summary["generated"] == 1
    assert summary["stored"] == 1
    assert summary["failed"] == 1
    assert any("bad" in e for e in summary["errors"])
    upsert_mock.assert_called_once()


def test_generate_batch_job_all_failed_skips_upsert(mocker):
    async def fake_generate(req: GenerationRequest) -> GenerationResult:
        raise RuntimeError("boom")

    fake_client = MagicMock()
    fake_client.generate = AsyncMock(side_effect=fake_generate)
    mocker.patch("app.workers.ai_pipeline.AIClient.create", return_value=fake_client)

    upsert_mock = mocker.patch("app.workers.ai_pipeline.upsert_results", return_value=0)

    summary = generate_batch_job([_payload_item("c1")])

    assert summary["generated"] == 0
    assert summary["stored"] == 0
    assert summary["failed"] == 1
    upsert_mock.assert_not_called()


def test_generate_batch_job_empty_payload(mocker):
    fake_client = MagicMock()
    fake_client.generate = AsyncMock()
    mocker.patch("app.workers.ai_pipeline.AIClient.create", return_value=fake_client)
    upsert_mock = mocker.patch("app.workers.ai_pipeline.upsert_results", return_value=0)

    summary = generate_batch_job([])

    assert summary["requested"] == 0
    assert summary["generated"] == 0
    upsert_mock.assert_not_called()
    fake_client.generate.assert_not_called()
