"""URL text analysis and independent Google Safe Browsing v5 lookup.

The submitted destination is never fetched or executed.
"""

import hashlib
import ipaddress
import logging
import re
import threading
import time
from collections import OrderedDict
from datetime import datetime
from typing import Literal

import httpx
from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.analysis import MessageAnalysisResponse
from app.core.config import settings
from app.models import get_datetime_utc

logger = logging.getLogger(__name__)


class UrlAnalysisRequest(BaseModel):
    url: HttpUrl = Field(max_length=4096)

    @field_validator("url")
    @classmethod
    def public_url(cls, value: HttpUrl) -> HttpUrl:
        if value.username is not None or value.password is not None:
            raise ValueError("Remove embedded usernames or passwords from the URL.")
        host = (value.host or "").strip("[]").lower().rstrip(".")
        if (
            host == "localhost"
            or host.endswith((".localhost", ".local"))
            or "." not in host
            and ":" not in host
        ):
            raise ValueError("Enter a public website URL.")
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            if not address.is_global:
                raise ValueError("Private or reserved IP addresses are not supported.")
        return value


class ReputationResult(BaseModel):
    provider: Literal["google_safe_browsing"] = "google_safe_browsing"
    status: Literal["matched", "no_match", "unavailable", "not_configured"]
    threat_types: list[str] = Field(default_factory=list)
    checked_at: datetime | None = None
    detail: str


class UrlAnalysisResponse(MessageAnalysisResponse):
    ai_risk_score: int
    ai_risk_level: Literal["low", "medium", "high", "unknown"]
    reputation: ReputationResult


# Cache positive AND negative responses for the server-provided duration.
# Bounded per-process cache; rotating credentials starts a separate cache entry.
_cache: OrderedDict[tuple[str, str], tuple[float, ReputationResult]] = OrderedDict()
_cache_lock = threading.Lock()


def check_url_reputation(url: str) -> ReputationResult:
    key = settings.GOOGLE_SAFE_BROWSING_API_KEY or settings.GOOGLE_API_KEY
    if not key:
        return ReputationResult(
            status="not_configured",
            detail="Reputation check is not configured. No reputation verdict is available.",
        )
    cache_key = (hashlib.sha256(key.get_secret_value().encode()).hexdigest(), url)
    with _cache_lock:
        cached = _cache.get(cache_key)
        if cached and cached[0] > time.monotonic():
            _cache.move_to_end(cache_key)
            return cached[1].model_copy(deep=True)
        _cache.pop(cache_key, None)
    try:
        # Keep credentials out of URLs/logs. Send only to this fixed Google endpoint.
        with httpx.Client(timeout=7, follow_redirects=False) as client:
            response = client.get(
                "https://safebrowsing.googleapis.com/v5/urls:search",
                params={"urls": url},
                headers={"X-Goog-Api-Key": key.get_secret_value()},
            )
        if response.status_code != 200:
            logger.warning(
                "Safe Browsing lookup failed (HTTP %s)", response.status_code
            )
            detail = (
                "Google Safe Browsing access was rejected. Enable the Safe Browsing API "
                "for this Google Cloud project and check API key restrictions."
                if response.status_code in (400, 401, 403)
                else "Google Safe Browsing is temporarily unavailable. No reputation verdict was obtained."
            )
            return ReputationResult(status="unavailable", detail=detail)
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Invalid reputation response")
        threats = payload.get("threats", [])
        if not isinstance(threats, list) or any(
            not isinstance(t, dict)
            or not isinstance(t.get("threatTypes"), list)
            or not t["threatTypes"]
            or any(not isinstance(v, str) for v in t["threatTypes"])
            for t in threats
        ):
            raise ValueError("Invalid reputation response")
        threat_types = sorted({v for t in threats for v in t["threatTypes"]})
        result = ReputationResult(
            status="matched" if threat_types else "no_match",
            threat_types=threat_types,
            checked_at=get_datetime_utc(),
            detail=(
                "Google Safe Browsing lists this URL or a matching URL expression as a known threat."
                if threat_types
                else "No match was found in Google Safe Browsing at the time of this check. This does not prove the website is safe."
            ),
        )
        duration = str(payload.get("cacheDuration", "0s"))
        if not re.fullmatch(r"\d+(?:\.\d{1,9})?s", duration):
            raise ValueError("Invalid cache duration")
        with _cache_lock:
            _cache[cache_key] = (time.monotonic() + float(duration[:-1]), result)
            _cache.move_to_end(cache_key)
            while len(_cache) > 1000:
                _cache.popitem(last=False)
        return result.model_copy(deep=True)
    except httpx.HTTPError, ValueError:
        return ReputationResult(
            status="unavailable",
            detail="Reputation lookup failed. No reputation verdict was obtained. Please try again later.",
        )
