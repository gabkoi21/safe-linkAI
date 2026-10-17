from collections.abc import Callable

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi import File as UploadField
from sqlalchemy.exc import SQLAlchemyError

from app.analysis import (
    AnalysisError,
    MessageAnalysisRequest,
    MessageAnalysisResponse,
    MessageAnalysisResult,
    analyze_message,
    analyze_url_patterns,
)
from app.api.deps import SessionDep
from app.core.config import settings
from app.file_analysis import (
    MAX_UPLOAD_BYTES,
    FileAnalysisResponse,
    FileMetadata,
    analyze_prepared_file,
    prepare_file,
    remove_file,
    store_file,
)
from app.models import (
    AnalysisReport,
    AnalysisStatus,
    File,
    ReportFinding,
    RiskLevel,
    Submission,
    SubmissionType,
    get_datetime_utc,
)
from app.url_analysis import (
    UrlAnalysisRequest,
    UrlAnalysisResponse,
    check_url_reputation,
)

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/file", response_model=FileAnalysisResponse, status_code=201)
def create_file_analysis(
    session: SessionDep, file: UploadFile = UploadField(...)
) -> FileAnalysisResponse:
    try:
        prepared = prepare_file(
            file.filename or "", file.file.read(MAX_UPLOAD_BYTES + 1)
        )
        key, path = store_file(prepared)
    except AnalysisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    finally:
        file.file.close()
    submission = Submission(type=SubmissionType.FILE)
    upload = File(
        submission=submission,
        original_name=prepared.name,
        storage_key=key,
        mime_type=prepared.mime_type,
        size_bytes=len(prepared.data),
        sha256=prepared.sha256,
    )
    details: dict = {}

    def analyze() -> MessageAnalysisResult:
        result, extraction = analyze_prepared_file(prepared)
        metadata = FileMetadata(
            file_id=upload.id,
            original_name=upload.original_name,
            mime_type=upload.mime_type,
            size_bytes=upload.size_bytes,
            sha256=upload.sha256,
        )
        details.update(
            file=metadata.model_dump(mode="json"), extraction=extraction.model_dump()
        )
        return result

    response = _create_analysis(
        submission,
        session,
        analyze,
        details,
        on_initial_failure=lambda: remove_file(path),
    )
    return FileAnalysisResponse(**response.model_dump(), **details)


@router.post("/message", response_model=MessageAnalysisResponse, status_code=201)
def create_message_analysis(
    body: MessageAnalysisRequest, session: SessionDep
) -> MessageAnalysisResponse:
    return _create_analysis(
        Submission(type=SubmissionType.MESSAGE, message_text=body.message),
        session,
        lambda: analyze_message(body.message),
    )


@router.post("/url", response_model=UrlAnalysisResponse, status_code=201)
def create_url_analysis(
    body: UrlAnalysisRequest, session: SessionDep
) -> UrlAnalysisResponse:
    url = str(body.url)
    details: dict = {}

    def analyze() -> MessageAnalysisResult:
        ai = analyze_url_patterns(url)
        reputation = check_url_reputation(url)
        details.update(
            ai_risk_score=ai.risk_score,
            ai_risk_level=ai.risk_level,
            reputation=reputation.model_dump(mode="json"),
        )
        # A known threat must not be displayed as low risk because its URL
        # looks ordinary. Keep Gemma's original assessment separately.
        if reputation.status == "matched":
            return ai.model_copy(
                update={
                    "risk_score": max(90, ai.risk_score),
                    "risk_level": "high",
                    "recommended_action": "Avoid opening this URL or entering personal information. Google Safe Browsing lists a known threat.",
                }
            )
        return ai

    response = _create_analysis(
        Submission(type=SubmissionType.URL, url=url), session, analyze, details
    )
    return UrlAnalysisResponse(**response.model_dump(), **details)


def _create_analysis(
    submission: Submission,
    session: SessionDep,
    analyze: Callable[[], MessageAnalysisResult],
    details: dict | None = None,
    on_initial_failure: Callable[[], None] | None = None,
) -> MessageAnalysisResponse:
    # Guest submissions are private and have no account owner.
    report = AnalysisReport(
        submission=submission,
        status=AnalysisStatus.PROCESSING,
        model_version=settings.GOOGLE_AI_MODEL,
    )
    session.add(submission)
    initial_committed = False
    try:
        session.commit()
        initial_committed = True
        # Capture IDs now; release the read transaction before the provider call.
        submission_id, report_id = submission.id, report.id
        session.commit()
        try:
            result = analyze()
        except AnalysisError as exc:
            report.status = AnalysisStatus.FAILED
            report.error_message = str(exc)
            report.completed_at = get_datetime_utc()
            session.add(report)
            session.commit()
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

        report.risk_score = result.risk_score
        report.analysis_details = details or None
        report.risk_level = RiskLevel(result.risk_level)
        report.summary = result.summary
        report.recommended_action = result.recommended_action
        report.status = AnalysisStatus.COMPLETED
        report.completed_at = get_datetime_utc()
        session.add(report)
        for finding in result.findings:
            session.add(
                ReportFinding(
                    report_id=report_id,
                    title=finding.title,
                    description=finding.description,
                    severity=RiskLevel(finding.severity),
                    evidence=finding.evidence,
                )
            )
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        if not initial_committed and on_initial_failure:
            on_initial_failure()
        raise HTTPException(
            status_code=503,
            detail="Could not save the analysis. Please try again later.",
        ) from exc
    return MessageAnalysisResponse(
        **result.model_dump(),
        submission_id=submission_id,
        report_id=report_id,
        model_version=settings.GOOGLE_AI_MODEL,
    )
