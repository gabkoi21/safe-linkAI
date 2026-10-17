import { z } from "zod"

const riskLevel = z.enum(["low", "medium", "high", "unknown"])
const score = z.number().finite().min(0).max(100)
const reportSchema = z.object({
  submission_id: z.string().min(1),
  report_id: z.string().min(1),
  model_version: z.string(),
  risk_score: score,
  risk_level: riskLevel,
  summary: z.string(),
  recommended_action: z.string(),
  findings: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      severity: riskLevel,
      evidence: z.string().nullable(),
    }),
  ),
})
const fileSchema = reportSchema.extend({
  file: z.object({
    file_id: z.string(),
    original_name: z.string(),
    mime_type: z.string(),
    size_bytes: z.number().nonnegative(),
    sha256: z.string(),
  }),
  extraction: z.object({
    method: z.enum(["text_extraction", "image_understanding"]),
    text: z.string(),
    pages: z.number().int().nonnegative().nullable(),
    limitations: z.array(z.string()),
  }),
})
const urlSchema = reportSchema.extend({
  ai_risk_score: score,
  ai_risk_level: riskLevel,
  reputation: z.object({
    provider: z.literal("google_safe_browsing"),
    status: z.enum(["matched", "no_match", "unavailable", "not_configured"]),
    threat_types: z.array(z.string()),
    checked_at: z.string().nullable(),
    detail: z.string(),
  }),
})

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

export interface FileAnalysis extends MessageAnalysis {
  file: {
    file_id: string
    original_name: string
    mime_type: string
    size_bytes: number
    sha256: string
  }
  extraction: {
    method: "text_extraction" | "image_understanding"
    text: string
    pages: number | null
    limitations: string[]
  }
}

export async function analyzeFile(file: File): Promise<FileAnalysis> {
  const payload = new FormData()
  payload.append("file", file)
  return requestAnalysis<FileAnalysis>("file", payload)
}

async function requestAnalysis<T extends MessageAnalysis>(
  kind: "message" | "url" | "file",
  payload: { message: string } | { url: string } | FormData,
): Promise<T> {
  const baseUrl = (import.meta.env?.VITE_API_URL ?? "").replace(/\/$/, "")
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/v1/analysis/${kind}`, {
      method: "POST",
      headers:
        payload instanceof FormData
          ? undefined
          : { "Content-Type": "application/json" },
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
      signal: AbortSignal.timeout(
        kind === "file" ? 90000 : kind === "url" ? 70000 : 60000,
      ),
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
        : `Could not analyze the ${kind === "url" ? "URL" : kind}. Check your input and try again.`,
    )
  }
  const schema =
    kind === "file" ? fileSchema : kind === "url" ? urlSchema : reportSchema
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new Error(
      `The analysis service returned an incomplete ${kind} report. Please try again. If this continues, check the analysis service response.`,
    )
  }
  return parsed.data as T
}
