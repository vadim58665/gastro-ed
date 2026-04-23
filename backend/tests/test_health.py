def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "gastroed-backend"}


def test_health_does_not_require_auth(client):
    response = client.get("/health")
    assert response.status_code == 200
