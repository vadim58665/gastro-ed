from app.config import Settings


def _prod_settings(**overrides) -> Settings:
    base = {
        "environment": "production",
        "testing": False,
        "supabase_url": "https://real.supabase.co",
        "supabase_service_role_key": "real-service-role-key-" + "x" * 50,
        "supabase_jwt_secret": "real-jwt-secret-" + "x" * 40,
    }
    base.update(overrides)
    return Settings(**base)


def test_development_never_validates():
    s = Settings(environment="development")
    assert s.validate_production_secrets() == []


def test_production_clean_config_has_no_issues():
    issues = _prod_settings().validate_production_secrets()
    assert issues == []


def test_production_flags_mock_supabase_url():
    s = _prod_settings(supabase_url="https://example.supabase.co")
    issues = s.validate_production_secrets()
    assert any("SUPABASE_URL" in i for i in issues)


def test_production_flags_mock_service_role():
    s = _prod_settings(supabase_service_role_key="mock-service-role-key")
    issues = s.validate_production_secrets()
    assert any("SUPABASE_SERVICE_ROLE_KEY" in i for i in issues)


def test_production_flags_short_jwt_secret():
    s = _prod_settings(supabase_jwt_secret="real-but-short")
    issues = s.validate_production_secrets()
    assert any("too short" in i for i in issues)


def test_testing_flag_bypasses_validation():
    s = _prod_settings(environment="production", testing=True)
    assert s.validate_production_secrets() == []
