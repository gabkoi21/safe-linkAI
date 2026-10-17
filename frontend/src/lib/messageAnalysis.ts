export interface MessageAnalysis {
  submission_id: string
  report_id: string
  model_version: string
  risk_score: number
  risk_level: "low" | "medium" | "high" | "unknown"
  summary: string
  recommended_action: string
  findings: {
    title: string
    description: string
    severity: "low" | "medium" | "high" | "unknown"
    evidence: string | null
  }[]
}

export async function analyzeMessage(
  message: string,
): Promise<MessageAnalysis> {
  return requestAnalysis<MessageAnalysis>("message", { message })
}

export interface UrlAnalysis extends MessageAnalysis {
  ai_risk_score: number
  ai_risk_level: MessageAnalysis["risk_level"]
  reputation: {
    provider: "google_safe_browsing"
    status: "matched" | "no_match" | "unavailable" | "not_configured"
    threat_types: string[]
    checked_at: string | null
    detail: string
  }
}

export async function analyzeUrl(url: string): Promise<UrlAnalysis> {
  return requestAnalysis<UrlAnalysis>("url", { url })
}

async function requestAnalysis<T extends MessageAnalysis>(
  kind: "message" | "url",
  payload: { message: string } | { url: string },
): Promise<T> {
  const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/v1/analysis/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(kind === "url" ? 70000 : 60000),
    })
  } catch (error) {
    if (
      error instanceof DOMException &&
      ["TimeoutError", "AbortError"].includes(error.name)
    ) {
      throw new Error("Analysis timed out. Please try again.")
    }
    throw new Error(
      "Could not connect to the analysis service. Check that the backend is running.",
    )
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : `Could not analyze the ${kind === "url" ? "URL" : "message"}. Check your input and try again.`,
    )
  }
  if (
    !body ||
    typeof body.risk_score !== "number" ||
    !Array.isArray(body.findings)
  ) {
    throw new Error("The server returned an invalid report. Please try again.")
  }
  return body as T
}
