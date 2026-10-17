from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.analysis import (
    AnalysisError,
    MessageAnalysisRequest,
    MessageAnalysisResponse,
    analyze_message,
)
from app.api.deps import SessionDep
from app.core.config import settings
from app.models import (
    AnalysisReport,
    AnalysisStatus,
    ReportFinding,
    RiskLevel,
    Submission,
    SubmissionType,
    get_datetime_utc,
)

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/message", response_model=MessageAnalysisResponse, status_code=201)
def create_message_analysis(
    body: MessageAnalysisRequest, session: SessionDep
) -> MessageAnalysisResponse:
    # Guest submissions are private and have no account owner.
    submission = Submission(type=SubmissionType.MESSAGE, message_text=body.message)
    report = AnalysisReport(
        submission=submission,
        status=AnalysisStatus.PROCESSING,
        model_version=settings.GOOGLE_AI_MODEL,
    )
    session.add(submission)
    try:
        session.commit()
        # Capture IDs now; release the read transaction before the provider call.
        submission_id, report_id = submission.id, report.id
        session.commit()
        try:
            result = analyze_message(body.message)
        except AnalysisError as exc:
            report.status = AnalysisStatus.FAILED
            report.error_message = str(exc)
            report.completed_at = get_datetime_utc()
            session.add(report)
            session.commit()
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

        report.risk_score = result.risk_score
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
