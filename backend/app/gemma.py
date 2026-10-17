"""Gemma 4 API integration shared by message and URL-pattern analysis."""

import logging

import httpx
from google import genai
from google.genai import errors, types

from app.analysis_errors import AnalysisError
from app.core.config import settings

logger = logging.getLogger(__name__)


def call_gemma(*, instruction: str, contents: str | list[types.Part]) -> str:
    """Call Gemma 4 and return its text, translating provider failures safely."""
    if not settings.GOOGLE_API_KEY:
        raise AnalysisError("AI analysis is not configured on the server.", 503)
    try:
        # Shared Gemma 4 integration for message and URL-pattern analysis.
        with genai.Client(
            api_key=settings.GOOGLE_API_KEY.get_secret_value(),
            http_options=types.HttpOptions(
                # Two bounded attempts leave time for database writes before
                # the frontend's 60-second deadline. Never retry bad credentials.
                timeout=20000,
                retry_options=types.HttpRetryOptions(
                    attempts=2,
                    initial_delay=1,
                    max_delay=2,
                    http_status_codes=[500, 502, 503, 504],
                ),
            ),
        ) as client:
            # Send the submitted text to Gemma 4 for a structured risk assessment.
            # GOOGLE_AI_MODEL defaults to gemma-4-26b-a4b-it in core/config.py
            # and can be overridden through the backend environment settings.
            response = client.models.generate_content(
                model=settings.GOOGLE_AI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=instruction,
                    temperature=0.1,
                    max_output_tokens=4096,
                    thinking_config=types.ThinkingConfig(thinking_level="minimal"),
                ),
            )
    except errors.APIError as exc:
        # Do not log provider messages: they may contain submitted text or secrets.
        logger.warning("Gemma request failed (HTTP %s)", exc.code)
        if exc.code == 429:
            raise AnalysisError(
                "AI request limit reached. Please try again later.", 429
            ) from exc
        if exc.code in (401, 403):
            raise AnalysisError(
                "Google AI rejected access. Check the server API key and model permissions.",
                503,
            ) from exc
        if exc.code == 404:
            raise AnalysisError(
                "The configured AI model is not available to this API key. Check GOOGLE_AI_MODEL.",
                503,
            ) from exc
        if exc.code == 400:
            raise AnalysisError(
                "Google AI rejected the request. Check the server API key and model configuration.",
                503,
            ) from exc
        if exc.code == 503:
            raise AnalysisError(
                "Gemma is temporarily busy. Please try again shortly.", 503
            ) from exc
        raise AnalysisError(
            "The AI service is unavailable. Please try again later."
        ) from exc
    except httpx.TimeoutException as exc:
        raise AnalysisError("AI analysis timed out. Please try again.", 504) from exc
    except httpx.HTTPError as exc:
        raise AnalysisError(
            "Could not reach the AI service. Please try again."
        ) from exc
    if not response.text:
        raise AnalysisError("The AI did not return an analysis. Please try again.")
    return response.text
