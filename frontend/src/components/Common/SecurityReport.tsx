import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  Link,
  MessageCircle,
  ShieldCheck,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type {
  FileAnalysis,
  MessageAnalysis,
  UrlAnalysis,
} from "@/lib/messageAnalysis"
import "./security-report.css"

export type ReportType = "message" | "url" | "file"
export type SecurityReportData = { content: string } & (
  | { type: "message"; analysis: MessageAnalysis }
  | { type: "url"; analysis: UrlAnalysis }
  | { type: "file"; analysis: FileAnalysis }
)
export default function SecurityReport({
  report,
  onClose,
}: {
  report: SecurityReportData | null
  onClose: () => void
}) {
  const modal = useRef<HTMLDialogElement>(null)
  const [copyStatus, setCopyStatus] = useState("")
  useEffect(() => {
    if (report) {
      setCopyStatus("")
      modal.current?.showModal()
    } else modal.current?.close()
  }, [report])
  if (!report) return null
  const active = report.type
  const { analysis, content } = report
  const level = analysis.risk_level
  const urlAnalysis = report.type === "url" ? report.analysis : null
  const reputation = urlAnalysis?.reputation
  const fileAnalysis = report.type === "file" ? report.analysis : null
  const assessment = {
    score: analysis.risk_score,
    level: level.charAt(0).toUpperCase() + level.slice(1),
    summary: analysis.summary,
    action: analysis.recommended_action,
  }
  const Icon =
    active === "message" ? MessageCircle : active === "url" ? Link : FileText
  async function copyReport() {
    const reputationText = reputation
      ? `\nGoogle Safe Browsing: ${reputation.status}\n${reputation.detail}\nThreat types: ${reputation.threat_types.join(", ") || "None reported"}\nChecked: ${reputation.checked_at ?? "Not checked"}\nGemma URL-pattern score: ${urlAnalysis?.ai_risk_score}/100\n`
      : fileAnalysis
        ? `\nFile SHA-256: ${fileAnalysis.file.sha256}\nReview method: ${fileAnalysis.extraction.method}\nLimitations: ${fileAnalysis.extraction.limitations.join(" ")}\n`
        : ""
    const text = `SafeLink AI — Security Analysis Report\nType: ${active}\nContent: ${content}\nRisk indicator score: ${assessment.score}/100 (${assessment.level})\nAssessment; not a guarantee of safety.\n${assessment.summary}\n${reputationText}\nGemma warning signs:\n${analysis.findings.map(({ title, description }) => `${title}: ${description}`).join("\n")}\n\nRecommended safety action: ${assessment.action}`
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus("Report copied")
    } catch {
      setCopyStatus(
        "Could not copy. Please allow clipboard access and try again.",
      )
    }
  }
  return (
    <dialog
      className={`security-report ${level}-risk`}
      ref={modal}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="security-report-title"
    >
      <header className="report-header">
        <ShieldCheck size={21} />
        <div>
          <h2 id="security-report-title">SafeLink AI</h2>
          <p>Security Analysis Report</p>
        </div>
        <span className="report-demo">Gemma 4</span>
        <button
          type="button"
          className="report-close"
          aria-label="Close report"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="report-tabs" role="tablist" aria-label="Report type">
        {(["message", "url", "file"] as const).map((type) => (
          <button
            type="button"
            key={type}
            className={`report-tab-${type}`}
            disabled={type !== report?.type}
            role="tab"
            id={`report-${type}-tab`}
            aria-selected={active === type}
            aria-controls="report-content"
          >
            {type === "message" ? "Message" : type === "url" ? "URL" : "File"}
          </button>
        ))}
      </div>
      <section
        id="report-content"
        role="tabpanel"
        aria-labelledby={`report-${active}-tab`}
      >
        <div className="report-analyzed">
          <h3>ANALYZED CONTENT</h3>
          <p>
            <Icon size={15} />
            <span>{content}</span>
          </p>
        </div>
        <div className="report-risk">
          <span className="risk-label">{assessment.level} risk indicators</span>
          <div
            className="risk-gauge"
            role="img"
            aria-label={`Risk indicator score ${assessment.score} out of 100`}
          >
            <svg viewBox="0 0 200 115" aria-hidden="true">
              <path className="gauge-track" d="M15 100 A85 85 0 0 1 185 100" />
              <path
                className="gauge-value"
                d="M15 100 A85 85 0 0 1 185 100"
                pathLength="100"
                strokeDasharray={`${assessment.score} 100`}
              />
            </svg>
            <div className="gauge-number">
              <strong>{assessment.score}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <p className="risk-caption">
            {active === "url"
              ? "Combined risk indicator score"
              : "AI risk indicator score"}{" "}
            — not a malware detection probability
          </p>
          <p className="risk-summary">{assessment.summary}</p>
          <p className="report-disclaimer">
            {active === "url"
              ? "The website was not opened. Gemma reviews URL text only; the reputation result below is a separate lookup. This is not a guarantee of safety."
              : active === "file"
                ? "Based on extracted document text or visible image content only. This is not an antivirus scan or a guarantee that the file is safe to open."
                : "Based on the submitted message only. AI can make mistakes; this is not a guarantee of safety or independent verification of the sender."}
          </p>
        </div>
        {fileAnalysis && (
          <section
            className="report-warning-section"
            aria-label="File review details"
          >
            <h3>File review details</h3>
            <p>
              {fileAnalysis.file.mime_type} ·{" "}
              {(fileAnalysis.file.size_bytes / 1024).toFixed(1)} KB
            </p>
            <p>
              Review method:{" "}
              {fileAnalysis.extraction.method === "image_understanding"
                ? "Gemma image understanding"
                : "Extracted document text"}
            </p>
            {fileAnalysis.extraction.pages !== null && (
              <p>PDF pages: {fileAnalysis.extraction.pages}</p>
            )}
            <p className="break-all">SHA-256: {fileAnalysis.file.sha256}</p>
            {fileAnalysis.extraction.limitations.map((limitation) => (
              <p key={limitation}>{limitation}</p>
            ))}
            <details>
              <summary>Show content reviewed</summary>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
                {fileAnalysis.extraction.text}
              </pre>
            </details>
          </section>
        )}
        <section className="report-warning-section">
          {reputation && (
            <section aria-label="URL reputation">
              <h3>URL reputation — Google Safe Browsing</h3>
              <p>
                <strong>
                  {reputation.status === "matched"
                    ? "Known threat listed"
                    : reputation.status === "no_match"
                      ? "No match — safety not confirmed"
                      : "Reputation not checked"}
                </strong>
              </p>
              <p>{reputation.detail}</p>
              {reputation.threat_types.length > 0 && (
                <p>Threat types: {reputation.threat_types.join(", ")}</p>
              )}
              {reputation.checked_at && (
                <p>
                  Checked: {new Date(reputation.checked_at).toLocaleString()}
                </p>
              )}
              <p>
                Gemma URL-pattern assessment: {urlAnalysis?.ai_risk_score}/100 (
                {urlAnalysis?.ai_risk_level}).
              </p>
              {reputation.status === "matched" && (
                <p>
                  The known threat match raises the overall risk rating to high.
                  Avoid opening this URL.
                </p>
              )}
            </section>
          )}
          <h3>
            <AlertTriangle size={16} /> Detected warning signs (Gemma)
          </h3>
          {analysis.findings.length === 0 && (
            <p>No specific warning signs identified.</p>
          )}
          <ul>
            {analysis.findings.map(
              ({ title, description, evidence }, index) => (
                <li key={`${title}-${index}`}>
                  <AlertTriangle size={14} />
                  <div>
                    <h4>{title}</h4>
                    <p>{description}</p>
                    {evidence && (
                      <p>
                        Evidence: <q>{evidence}</q>
                      </p>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>
        <section className="report-safety">
          <h3>
            <ShieldCheck size={17} /> Recommended safety action
          </h3>
          <p>{assessment.action}</p>
        </section>
      </section>
      <button type="button" className="copy-report" onClick={copyReport}>
        {copyStatus === "Report copied" ? (
          <Check size={15} />
        ) : (
          <Copy size={15} />
        )}
        {copyStatus === "Report copied" ? "Copied" : "Copy Security Report"}
      </button>
      <p className="report-copy-status" role="status">
        {copyStatus}
      </p>
    </dialog>
  )
}
