import unittest
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.analysis import AnalysisError, MessageAnalysisResult
from app.api.deps import get_db
from app.api.routes.analysis import router
from app.core.config import settings
from app.models import AnalysisReport, AnalysisStatus, Submission, SubmissionType
from app.url_analysis import (
    ReputationResult,
    UrlAnalysisRequest,
    _cache,
    check_url_reputation,
)

URL = "https://example.com/verify"
AI = MessageAnalysisResult(
    risk_score=20,
    risk_level="low",
    summary="No clear URL-pattern indicators.",
    recommended_action="Verify the destination independently.",
    findings=[],
)


class UrlEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        SQLModel.metadata.create_all(self.engine)
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")

        def database():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_db] = database
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def test_reputation_match_overrides_low_ai_score_and_is_saved(self):
        reputation = ReputationResult(
            status="matched",
            threat_types=["SOCIAL_ENGINEERING"],
            detail="Known threat match.",
        )
        with (
            patch("app.api.routes.analysis.analyze_url_patterns", return_value=AI),
            patch(
                "app.api.routes.analysis.check_url_reputation", return_value=reputation
            ),
        ):
            response = self.client.post("/api/v1/analysis/url", json={"url": URL})
        self.assertEqual(response.status_code, 201)
        result = response.json()
        self.assertEqual(result["risk_level"], "high")
        self.assertGreaterEqual(result["risk_score"], 90)
        self.assertEqual(result["ai_risk_score"], 20)
        self.assertIn("Avoid opening", result["recommended_action"])
        with Session(self.engine) as session:
            submission = session.exec(select(Submission)).one()
            report = session.exec(select(AnalysisReport)).one()
            self.assertEqual(submission.type, SubmissionType.URL)
            self.assertEqual(submission.url, URL)
            self.assertIsNone(submission.message_text)
            self.assertEqual(report.analysis_details["reputation"]["status"], "matched")
            self.assertEqual(report.analysis_details["ai_risk_score"], 20)

    def test_reputation_outage_returns_real_ai_assessment_with_explicit_status(self):
        reputation = ReputationResult(
            status="unavailable", detail="Reputation service unavailable."
        )
        with (
            patch("app.api.routes.analysis.analyze_url_patterns", return_value=AI),
            patch(
                "app.api.routes.analysis.check_url_reputation", return_value=reputation
            ),
        ):
            response = self.client.post("/api/v1/analysis/url", json={"url": URL})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["reputation"]["status"], "unavailable")
        self.assertEqual(response.json()["risk_score"], 20)

    def test_ai_failure_has_no_demo_report(self):
        with patch(
            "app.api.routes.analysis.analyze_url_patterns",
            side_effect=AnalysisError("AI unavailable.", 502),
        ):
            response = self.client.post("/api/v1/analysis/url", json={"url": URL})
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("risk_score", response.json())
        with Session(self.engine) as session:
            report = session.exec(select(AnalysisReport)).one()
            self.assertEqual(report.status, AnalysisStatus.FAILED)
            self.assertIsNone(report.risk_score)

    def test_invalid_url_never_calls_providers(self):
        with (
            patch("app.api.routes.analysis.analyze_url_patterns") as ai,
            patch("app.api.routes.analysis.check_url_reputation") as reputation,
        ):
            for url in (
                "javascript:alert(1)",
                "ftp://example.com",
                "not-a-url",
                "http://127.0.0.1",
                "http://localhost/",
                "http://[::1]/",
                "https://name:secret@example.com",
                "http://10.0.0.1",
            ):
                self.assertEqual(
                    self.client.post(
                        "/api/v1/analysis/url", json={"url": url}
                    ).status_code,
                    422,
                    url,
                )
            ai.assert_not_called()
            reputation.assert_not_called()


class ReputationTests(unittest.TestCase):
    def setUp(self):
        _cache.clear()
        token_patch = patch.object(settings, "GOOGLE_SAFE_BROWSING_ACCESS_TOKEN", None)
        token_patch.start()
        self.addCleanup(token_patch.stop)

    def test_oauth_token_takes_precedence_over_api_key(self):
        with (
            patch.object(
                settings, "GOOGLE_SAFE_BROWSING_ACCESS_TOKEN", SecretStr("test-token")
            ),
            patch("app.url_analysis.httpx.Client") as client,
        ):
            lookup = client.return_value.__enter__.return_value.get
            lookup.return_value = httpx.Response(
                200, json={"threats": [], "cacheDuration": "300s"}
            )
            self.assertEqual(check_url_reputation(URL).status, "no_match")
            headers = lookup.call_args.kwargs["headers"]
            self.assertEqual(headers["Authorization"], "Bearer test-token")
            self.assertNotIn("X-Goog-Api-Key", headers)

    def test_normalizes_url_and_rejects_oversized_input(self):
        self.assertEqual(
            str(UrlAnalysisRequest(url="HTTPS://EXAMPLE.COM").url),
            "https://example.com/",
        )
        with self.assertRaises(ValidationError):
            UrlAnalysisRequest(url="https://example.com/" + "a" * 4096)

    def test_missing_credentials_never_calls_network(self):
        with (
            patch.object(settings, "GOOGLE_API_KEY", None),
            patch.object(settings, "GOOGLE_SAFE_BROWSING_API_KEY", None),
            patch("app.url_analysis.httpx.Client") as client,
        ):
            self.assertEqual(check_url_reputation(URL).status, "not_configured")
            client.assert_not_called()

    def test_match_and_no_match_are_cached_for_supplied_duration(self):
        for threats, expected in (
            ([], "no_match"),
            ([{"url": URL, "threatTypes": ["SOCIAL_ENGINEERING"]}], "matched"),
        ):
            _cache.clear()
            with (
                patch.object(
                    settings, "GOOGLE_SAFE_BROWSING_API_KEY", SecretStr("test-only")
                ),
                patch("app.url_analysis.httpx.Client") as client,
            ):
                lookup = client.return_value.__enter__.return_value.get
                lookup.return_value = httpx.Response(
                    200, json={"threats": threats, "cacheDuration": "300s"}
                )
                first = check_url_reputation(URL)
                self.assertEqual(first.status, expected)
                self.assertEqual(check_url_reputation(URL).status, expected)
                self.assertEqual(lookup.call_count, 1)
                self.assertEqual(
                    lookup.call_args.args[0],
                    "https://safebrowsing.googleapis.com/v5/urls:search",
                )
                self.assertEqual(lookup.call_args.kwargs["params"]["urls"], URL)
                self.assertNotIn("key", lookup.call_args.kwargs["params"])

    def test_failures_are_never_interpreted_as_no_match(self):
        for response in (
            httpx.Response(403, json={"error": "Denied"}),
            httpx.Response(200, json={"threats": "bad"}),
            httpx.Response(200, json={"error": "bad"}),
            httpx.Response(200, text="not json"),
        ):
            with (
                patch.object(
                    settings, "GOOGLE_SAFE_BROWSING_API_KEY", SecretStr("test-only")
                ),
                patch("app.url_analysis.httpx.Client") as client,
            ):
                client.return_value.__enter__.return_value.get.return_value = response
                self.assertEqual(check_url_reputation(URL).status, "unavailable")
        with (
            patch.object(
                settings, "GOOGLE_SAFE_BROWSING_API_KEY", SecretStr("test-only")
            ),
            patch("app.url_analysis.httpx.Client") as client,
        ):
            client.return_value.__enter__.return_value.get.side_effect = (
                httpx.ReadTimeout("private")
            )
            self.assertEqual(check_url_reputation(URL).status, "unavailable")
