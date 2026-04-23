"""CLI для ручного запуска AI-pipeline без HTTP и без RQ.

Читает JSON-файл формата:
    {"items": [{"entity_type": "...", "entity_id": "...", "content_type": "...", "prompt": "..."}, ...]}

Используется для локальных dry-run прогонов. Реальные прогоны в проде -
через POST /api/ai/enqueue.

Пример:
    python -m app.cli generate /tmp/batch.json --limit=5 --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

from app.models.ai import GenerationRequest
from app.services.ai_client import AIClient
from app.services.prebuilt_store import upsert_results

log = logging.getLogger("cli")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


def _load_items(path: Path, limit: int | None) -> list[GenerationRequest]:
    data = json.loads(path.read_text(encoding="utf-8"))
    raw = data.get("items") if isinstance(data, dict) else data
    if raw is None:
        raise SystemExit(f"No `items` in {path}")
    if limit is not None:
        raw = raw[:limit]
    return [GenerationRequest.model_validate(x) for x in raw]


async def _generate_all(items: list[GenerationRequest]) -> tuple[list, list[str]]:
    client = AIClient.create()
    results = []
    errors = []
    for item in items:
        try:
            res = await client.generate(item)
            results.append(res)
            log.info("done %s/%s", item.entity_type.value, item.entity_id)
        except Exception as exc:
            errors.append(f"{item.entity_type.value}/{item.entity_id}: {exc!r}")
            log.error("failed %s/%s: %s", item.entity_type.value, item.entity_id, exc)
    return results, errors


def cmd_generate(args: argparse.Namespace) -> int:
    items = _load_items(Path(args.path), args.limit)
    log.info("loaded %d items from %s", len(items), args.path)

    if args.dry_run:
        for it in items:
            log.info(
                "[dry-run] %s/%s %s", it.entity_type.value, it.entity_id, it.content_type.value
            )
        return 0

    results, errors = asyncio.run(_generate_all(items))
    stored = upsert_results(results) if not args.no_store else 0
    cost = sum(r.cost_usd for r in results)

    log.info(
        "generated=%d stored=%d failed=%d cost=$%.4f",
        len(results),
        stored,
        len(errors),
        cost,
    )
    for err in errors[:10]:
        log.warning("  %s", err)
    return 1 if errors else 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    gen = sub.add_parser("generate", help="Сгенерировать batch из JSON-файла")
    gen.add_argument("path", help="Путь к JSON-файлу с items")
    gen.add_argument("--limit", type=int, default=None)
    gen.add_argument(
        "--dry-run", action="store_true", help="Не вызывать Anthropic, только показать"
    )
    gen.add_argument("--no-store", action="store_true", help="Не UPSERT в Supabase")
    gen.set_defaults(func=cmd_generate)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
