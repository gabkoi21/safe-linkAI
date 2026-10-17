"""Enforce the upload body limit before the multipart parser writes temp files."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings
from app.file_analysis import MAX_UPLOAD_BYTES


class UploadSizeLimitMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or scope["path"].rstrip("/") != f"{settings.API_V1_STR}/analysis/file"
        ):
            await self.app(scope, receive, send)
            return
        maximum = MAX_UPLOAD_BYTES + 65536  # Multipart headers and boundaries.
        headers = dict(scope.get("headers", []))
        try:
            declared = int(headers.get(b"content-length", b"0"))
        except ValueError:
            declared = 0
        if declared > maximum:
            await JSONResponse(
                {"detail": "Choose a file no larger than 10 MB."}, status_code=413
            )(scope, receive, send)
            return
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > maximum:
                await JSONResponse(
                    {"detail": "Choose a file no larger than 10 MB."}, status_code=413
                )(scope, receive, send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break
        body = b"".join(chunks)
        delivered = False

        async def replay() -> dict:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay, send)
