from unittest.mock import MagicMock

from app.models.ai import ContentType, EntityType, GenerationResult
from app.services import prebuilt_store


def _supabase_mock(upsert_data=None, select_pages=None):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table

    upsert_builder = MagicMock()
    upsert_exec = MagicMock()
    upsert_exec.data = upsert_data if upsert_data is not None else []
    upsert_builder.execute.return_value = upsert_exec
    table.upsert.return_value = upsert_builder

    select_builder = MagicMock()
    table.select.return_value = select_builder
    select_builder.eq.return_value = select_builder
    range_builder = MagicMock()
    select_builder.range.return_value = range_builder

    pages = iter(select_pages or [[]])

    def fake_execute():
        resp = MagicMock()
        try:
            resp.data = next(pages)
        except StopIteration:
            resp.data = []
        return resp

    range_builder.execute.side_effect = fake_execute

    return sb


def _result(entity_id: str = "c1") -> GenerationResult:
    return GenerationResult(
        entity_type=EntityType.CARD,
        entity_id=entity_id,
        content_type=ContentType.HINT,
        content_ru="hint text",
        model_used="claude-haiku-4-5-20251001",
        tokens_used=100,
        cost_usd=0.001,
    )


def test_upsert_empty_skips_db_call(mocker):
    sb = MagicMock()
    mocker.patch.object(prebuilt_store, "get_supabase", return_value=sb)

    assert prebuilt_store.upsert_results([]) == 0
    sb.table.assert_not_called()


def test_upsert_forms_rows_and_calls_supabase(mocker):
    sb = _supabase_mock(upsert_data=[{"id": 1}])
    mocker.patch.object(prebuilt_store, "get_supabase", return_value=sb)

    count = prebuilt_store.upsert_results([_result()])

    assert count == 1
    sb.table.assert_called_once_with("prebuilt_content")

    upsert_call = sb.table.return_value.upsert.call_args
    rows = upsert_call.args[0]
    assert rows[0]["entity_type"] == "card"
    assert rows[0]["entity_id"] == "c1"
    assert rows[0]["content_type"] == "hint"
    assert rows[0]["content_ru"] == "hint text"
    assert rows[0]["tokens_used"] == 100
    assert rows[0]["cost_usd"] == 0.001
    assert "updated_at" in rows[0]
    assert upsert_call.kwargs["on_conflict"] == "entity_type,entity_id,content_type"


def test_list_existing_ids_handles_pagination(mocker):
    page1 = [{"entity_id": f"id-{i}"} for i in range(1000)]
    page2 = [{"entity_id": "last"}]
    sb = _supabase_mock(select_pages=[page1, page2])
    mocker.patch.object(prebuilt_store, "get_supabase", return_value=sb)

    ids = prebuilt_store.list_existing_ids(EntityType.CARD, ContentType.HINT)

    assert len(ids) == 1001
    assert "last" in ids
    assert "id-0" in ids


def test_list_existing_ids_returns_empty_on_no_data(mocker):
    sb = _supabase_mock(select_pages=[[]])
    mocker.patch.object(prebuilt_store, "get_supabase", return_value=sb)

    ids = prebuilt_store.list_existing_ids(EntityType.CARD, ContentType.HINT)
    assert ids == set()
