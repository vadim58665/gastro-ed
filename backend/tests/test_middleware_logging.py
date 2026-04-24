import logging


def test_request_id_header_returned(client):
    response = client.get("/health")
    assert response.status_code == 200
    rid = response.headers.get("X-Request-ID")
    assert rid
    assert len(rid) >= 8


def test_request_id_preserved_from_client(client):
    response = client.get("/health", headers={"X-Request-ID": "my-trace-abc"})
    assert response.headers["X-Request-ID"] == "my-trace-abc"


def test_request_logs_include_request_id(client, caplog):
    with caplog.at_level(logging.INFO, logger="http"):
        response = client.get("/health", headers={"X-Request-ID": "trace-999"})
        assert response.status_code == 200

    records = [r for r in caplog.records if r.name == "http"]
    assert records, "http logger did not emit records"
    rec = records[-1]
    assert rec.request_id == "trace-999"
    assert rec.method == "GET"
    assert rec.path == "/health"
    assert rec.status == 200
    assert rec.duration_ms >= 0


def test_request_id_on_error_response(client, mocker):
    def _boom():
        raise RuntimeError("boom")

    mocker.patch("app.db.supabase_client.get_supabase", side_effect=_boom)

    response = client.get("/health/ready")
    # readiness gracefully catches errors inside and returns 503 (не 500)
    assert response.status_code == 503
    assert response.headers.get("X-Request-ID")
