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
import "./security-report.css"

export type ReportType = "message" | "url" | "file"
const examples = {
  message: {
    score: 85,
    level: "High",
    summary:
      "This example shows several common phishing indicators, including urgency and a request for sensitive information.",
    warnings: [
      ["Urgency detected", "The sender pressures you to act immediately."],
      [
        "Credential request",
        "The message asks you to provide an OTP or password.",
      ],
      [
        "Impersonation",
        "The sender claims to represent a financial institution.",
      ],
    ],
    action:
      "Do not share your OTP. Contact the bank using its official website or phone number.",
    content: "Suspicious bank verification message",
  },
  url: {
    score: 60,
    level: "Medium",
    summary:
      "The example URL structure resembles an account verification page, but there is insufficient evidence to establish whether it is malicious.",
    warnings: [
      [
        "Account verification path",
        "The example URL contains a login or verification-related path.",
      ],
      [
        "Sender not verified",
        "No independent domain ownership or reputation check has been performed.",
      ],
    ],
    action:
      "Do not enter credentials. Visit the service through its known official website instead.",
    content: "https://secure-bank.login.example/verify",
  },
  file: {
    score: 80,
    level: "High",
    summary:
      "The example document contains suspicious payment instructions and pressure to act urgently.",
    warnings: [
      [
        "Payment request",
        "The document requests payment to an unfamiliar account.",
      ],
      [
        "Urgent instructions",
        "The recipient is pressured to complete the payment immediately.",
      ],
      [
        "Unverified identity",
        "The claimed organization’s identity has not been confirmed.",
      ],
    ],
    action:
      "Verify the invoice using an established contact method before sending any money.",
    content: "Payment_Notice.pdf",
  },
}
export default function SecurityReport({
  report,
  onClose,
}: {
  report: { type: ReportType; content: string } | null
  onClose: () => void
}) {
  const modal = useRef<HTMLDialogElement>(null)
  const [active, setActive] = useState<ReportType>("message")
  const [copyStatus, setCopyStatus] = useState("")
  useEffect(() => {
    if (report) {
      setActive(report.type)
      setCopyStatus("")
      modal.current?.showModal()
    } else modal.current?.close()
  }, [report])
  const example = examples[active]
  const content = active === report?.type ? report.content : example.content
  const Icon =
    active === "message" ? MessageCircle : active === "url" ? Link : FileText
  async function copyReport() {
    const text = `SafeLink AI — Demo Security Analysis Report\nType: ${active}\nContent: ${content}\nIllustrative risk score: ${example.score}/100 (${example.level})\nDemo data only. Submitted content has not been analyzed.\n${example.summary}\n\nExample warning signs:\n${example.warnings.map(([title, description]) => `${title}: ${description}`).join("\n")}\n\nRecommended safety action: ${example.action}`
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
      className={`security-report ${active === "url" ? "medium-risk" : "high-risk"}`}
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
        <span className="report-demo">Demo</span>
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
          <span className="risk-label">{example.level} risk indicators</span>
          <div
            className="risk-gauge"
            role="img"
            aria-label={`Illustrative risk score ${example.score} out of 100`}
          >
            <svg viewBox="0 0 200 115" aria-hidden="true">
              <path className="gauge-track" d="M15 100 A85 85 0 0 1 185 100" />
              <path
                className="gauge-value"
                d="M15 100 A85 85 0 0 1 185 100"
                pathLength="100"
                strokeDasharray={`${example.score} 100`}
              />
            </svg>
            <div className="gauge-number">
              <strong>{example.score}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <p className="risk-caption">
            Illustrative AI risk score — not a malware detection probability
          </p>
          <p className="risk-summary">{example.summary}</p>
          <p className="report-disclaimer">
            Demo data only. Your submitted content has not been analyzed.
            Warning signs below are examples.
          </p>
        </div>
        <section className="report-warning-section">
          <h3>
            <AlertTriangle size={16} /> Detected warning signs{" "}
            <span className="report-example-label">Example</span>
          </h3>
          <ul>
            {example.warnings.map(([title, description]) => (
              <li key={title}>
                <AlertTriangle size={14} />
                <div>
                  <h4>{title}</h4>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="report-safety">
          <h3>
            <ShieldCheck size={17} /> Recommended safety action
          </h3>
          <p>{example.action}</p>
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
