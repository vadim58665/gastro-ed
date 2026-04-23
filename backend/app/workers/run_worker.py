"""RQ worker entrypoint. Фаза 0: заглушка, чтобы docker-compose worker стартовал.

Фаза 1 добавит реальные задачи (AI pipeline).
"""

from __future__ import annotations

import logging
import sys

from redis import Redis
from rq import Queue, Worker

from app.config import get_settings

log = logging.getLogger("worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


def main() -> int:
    settings = get_settings()
    log.info("starting worker, redis=%s", settings.redis_url)

    redis_conn = Redis.from_url(settings.redis_url)
    queues = [Queue("default", connection=redis_conn)]

    worker = Worker(queues, connection=redis_conn)
    worker.work(with_scheduler=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
