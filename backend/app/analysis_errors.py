"""Shared errors for analysis and AI provider calls."""


class AnalysisError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code

