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
  const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/v1/analysis/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(60000),
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
        : "Could not analyze the message. Please try again.",
    )
  }
  if (
    !body ||
    typeof body.risk_score !== "number" ||
    !Array.isArray(body.findings)
  ) {
    throw new Error("The server returned an invalid report. Please try again.")
  }
  return body as MessageAnalysis
}
