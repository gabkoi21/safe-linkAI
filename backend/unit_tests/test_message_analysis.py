"""Isolated tests: no real database or Google API calls."""

import json
import unittest
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from google.genai import errors
from pydantic import SecretStr
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.analysis import AnalysisError, analyze_message, parse_result
from app.api.deps import get_db
from app.api.routes.analysis import router
from app.core.config import settings
from app.models import AnalysisReport, AnalysisStatus, ReportFinding, Submission

MESSAGE = "Send your password now."
RESULT = {
    "risk_score": 90,
    "risk_level": "high",
    "summary": "The message requests credentials.",
    "recommended_action": "Do not share your password.",
    "findings": [
        {
            "title": "Credential request",
            "description": "The sender asks for a password.",
            "severity": "high",
            "evidence": "Send your password",
        }
    ],
}


class MessageEndpointTests(unittest.TestCase):
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

    def test_success_saves_private_guest_submission_report_and_findings(self):
        with patch(
            "app.api.routes.analysis.analyze_message",
            return_value=parse_result(json.dumps(RESULT), MESSAGE),
        ):
            response = self.client.post(
                "/api/v1/analysis/message", json={"message": MESSAGE}
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["risk_score"], 90)
        with Session(self.engine) as session:
            submission = session.exec(select(Submission)).one()
            report = session.exec(select(AnalysisReport)).one()
            finding = session.exec(select(ReportFinding)).one()
            self.assertIsNone(submission.user_id)
            self.assertEqual(submission.visibility.value, "private")
            self.assertEqual(report.status, AnalysisStatus.COMPLETED)
            self.assertEqual(str(report.id), response.json()["report_id"])
            self.assertEqual(finding.report_id, report.id)
            self.assertEqual(finding.evidence, "Send your password")
            self.assertIsNotNone(report.completed_at)

    def test_provider_failure_saved_without_score_or_findings(self):
        with patch(
            "app.api.routes.analysis.analyze_message",
            side_effect=AnalysisError("AI analysis timed out. Please try again.", 504),
        ):
            response = self.client.post(
                "/api/v1/analysis/message", json={"message": MESSAGE}
            )
        self.assertEqual(response.status_code, 504)
        self.assertNotIn("risk_score", response.json())
        with Session(self.engine) as session:
            report = session.exec(select(AnalysisReport)).one()
            self.assertEqual(report.status, AnalysisStatus.FAILED)
            self.assertIsNone(report.risk_score)
            self.assertIsNotNone(report.error_message)
            self.assertEqual(session.exec(select(ReportFinding)).all(), [])

    def test_invalid_message_never_calls_provider_or_creates_records(self):
        with patch("app.api.routes.analysis.analyze_message") as provider:
            for message in ("", "   ", "a" * 20001):
                with self.subTest(message_length=len(message)):
                    response = self.client.post(
                        "/api/v1/analysis/message", json={"message": message}
                    )
                    self.assertEqual(response.status_code, 422)
            provider.assert_not_called()
        with Session(self.engine) as session:
            self.assertEqual(session.exec(select(Submission)).all(), [])


class ProviderTests(unittest.TestCase):
    def test_parser_accepts_json_and_code_fenced_json(self):
        for content in (json.dumps(RESULT), "```json\n" + json.dumps(RESULT) + "\n```"):
            self.assertEqual(parse_result(content, MESSAGE).risk_score, 90)

    def test_parser_rejects_invalid_scores_and_fabricated_evidence(self):
        for content in (
            "not json",
            json.dumps({**RESULT, "risk_score": 101}),
            json.dumps({**RESULT, "risk_score": "90"}),
            json.dumps(RESULT).replace("Send your password", "Imaginary evidence"),
        ):
            with self.subTest(content=content), self.assertRaises(AnalysisError):
                parse_result(content, MESSAGE)

    def test_sdk_receives_configured_model_and_untrusted_message(self):
        with (
            patch.object(settings, "GOOGLE_API_KEY", SecretStr("test-only")),
            patch("app.gemma.genai.Client") as client,
        ):
            generate = (
                client.return_value.__enter__.return_value.models.generate_content
            )
            generate.return_value.text = json.dumps(RESULT)
            result = analyze_message(MESSAGE)
            self.assertEqual(result.risk_level, "high")
            options = client.call_args.kwargs["http_options"]
            self.assertEqual(options.retry_options.attempts, 2)
            self.assertEqual(options.timeout, 20000)
            self.assertNotIn(403, options.retry_options.http_status_codes)
            self.assertEqual(
                generate.call_args.kwargs["model"], settings.GOOGLE_AI_MODEL
            )
            self.assertEqual(
                json.loads(generate.call_args.kwargs["contents"])["message_to_analyze"],
                MESSAGE,
            )

    def test_missing_key_never_calls_sdk(self):
        with (
            patch.object(settings, "GOOGLE_API_KEY", None),
            patch("app.gemma.genai.Client") as client,
            self.assertRaises(AnalysisError) as error,
        ):
            analyze_message(MESSAGE)
        self.assertEqual(error.exception.status_code, 503)
        client.assert_not_called()

    def test_timeout_and_quota_errors_are_safe(self):
        for failure, status in (
            (httpx.ReadTimeout("private provider details"), 504),
            (errors.ClientError(429, {}), 429),
            (errors.ClientError(403, {}), 503),
            (errors.ClientError(404, {}), 503),
            (errors.ClientError(400, {}), 503),
            (errors.ServerError(503, {}), 503),
        ):
            with (
                self.subTest(status=status),
                patch.object(settings, "GOOGLE_API_KEY", SecretStr("test-only")),
                patch("app.gemma.genai.Client") as client,
            ):
                client.return_value.__enter__.return_value.models.generate_content.side_effect = failure
                with self.assertRaises(AnalysisError) as error:
                    analyze_message(MESSAGE)
                self.assertEqual(error.exception.status_code, status)
                self.assertNotIn("private provider details", str(error.exception))


if __name__ == "__main__":
    unittest.main()
