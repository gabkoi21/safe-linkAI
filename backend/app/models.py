import uuid
from datetime import UTC, datetime
from enum import StrEnum

from pydantic import EmailStr
from sqlalchemy import JSON, CheckConstraint, DateTime, Text
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(default_factory=get_datetime_utc)
    submissions: list[Submission] = Relationship(
        back_populates="user", cascade_delete=True
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


class SubmissionType(StrEnum):
    MESSAGE = "message"
    URL = "url"
    FILE = "file"


class SubmissionVisibility(StrEnum):
    PRIVATE = "private"
    PUBLIC = "public"


class AnalysisStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RiskLevel(StrEnum):
    UNKNOWN = "unknown"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Submission(SQLModel, table=True):
    __tablename__ = "submission"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Guest submissions do not have an account owner.
    user_id: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", index=True, ondelete="CASCADE"
    )
    type: SubmissionType = Field(index=True)
    message_text: str | None = Field(default=None, sa_type=Text)
    url: str | None = Field(default=None, sa_type=Text)
    visibility: SubmissionVisibility = Field(default=SubmissionVisibility.PRIVATE)
    created_at: datetime = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True), index=True
    )
    user: User | None = Relationship(back_populates="submissions")
    files: list[File] = Relationship(back_populates="submission", cascade_delete=True)
    reports: list[AnalysisReport] = Relationship(
        back_populates="submission", cascade_delete=True
    )


class File(SQLModel, table=True):
    __tablename__ = "file"
    __table_args__ = (CheckConstraint("size_bytes >= 0", name="file_size_nonnegative"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    submission_id: uuid.UUID = Field(
        foreign_key="submission.id", index=True, ondelete="CASCADE"
    )
    original_name: str = Field(max_length=255)
    # Store uploaded bytes outside the database; this identifies their location.
    storage_key: str = Field(sa_type=Text)
    mime_type: str = Field(max_length=255)
    size_bytes: int = Field(ge=0)
    sha256: str = Field(min_length=64, max_length=64, index=True)
    created_at: datetime = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    submission: Submission = Relationship(back_populates="files")


class AnalysisReport(SQLModel, table=True):
    __tablename__ = "analysis_report"
    __table_args__ = (
        CheckConstraint(
            "risk_score >= 0 AND risk_score <= 100", name="report_risk_score_range"
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    submission_id: uuid.UUID = Field(
        foreign_key="submission.id", index=True, ondelete="CASCADE"
    )
    status: AnalysisStatus = Field(default=AnalysisStatus.PENDING, index=True)
    # Pending/failed analysis must not look like a completed low-risk result.
    risk_score: int | None = Field(default=None, ge=0, le=100)
    risk_level: RiskLevel = Field(default=RiskLevel.UNKNOWN)
    summary: str | None = Field(default=None, sa_type=Text)
    recommended_action: str | None = Field(default=None, sa_type=Text)
    model_version: str | None = Field(default=None, max_length=255)
    error_message: str | None = Field(default=None, sa_type=Text)
    # Provider provenance and URL reputation results, separate from AI findings.
    analysis_details: dict | None = Field(default=None, sa_type=JSON)
    created_at: datetime = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True), index=True
    )
    completed_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    submission: Submission = Relationship(back_populates="reports")
    findings: list[ReportFinding] = Relationship(
        back_populates="report", cascade_delete=True
    )


class ReportFinding(SQLModel, table=True):
    __tablename__ = "report_finding"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    report_id: uuid.UUID = Field(
        foreign_key="analysis_report.id", index=True, ondelete="CASCADE"
    )
    title: str = Field(max_length=255)
    description: str = Field(sa_type=Text)
    severity: RiskLevel = Field(default=RiskLevel.UNKNOWN)
    evidence: str | None = Field(default=None, sa_type=Text)
    report: AnalysisReport = Relationship(back_populates="findings")


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
