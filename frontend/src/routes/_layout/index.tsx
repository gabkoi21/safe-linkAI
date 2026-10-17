import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import {
  ArrowRight,
  Check,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  LockKeyhole,
  MessageCircle,
  Moon,
  Rocket,
  Search,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from "lucide-react"
import type { ChangeEvent, DragEvent } from "react"
import { useEffect, useRef, useState } from "react"
import SecurityReport, {
  type SecurityReportData,
} from "@/components/Common/SecurityReport"
import { useTheme } from "@/components/theme-provider"
import { analyzeMessage, analyzeUrl } from "@/lib/messageAnalysis"
import "./home.css"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "SafeLink AI — Threat Analysis" }] }),
})

const submissions = [
  "1d80e9061d11b4948c8d184f57457d479a0c9153",
  "eb33dd701be7b73d6a335f0f1cf8b3c34a727a6",
  "6af862eea03b4ac599b128e4deabffd6c02c8912",
  "01a36e99ae8f6b4437af89a56f003026cae415b",
  "214273fb1c10ccbb6ee25d4367e9eff497198a43",
]
const articles = [
  {
    category: "Platform updates",
    title: "A clearer view of the threats ahead",
    description:
      "Meet your new workspace for investigating suspicious files and links. Built to make your next security decision a little clearer.",

    image: "threat-map",
    imageAlt: "Global cyber threat activity map",
  },
  {
    category: "Threat research",
    title: "Recognizing the signs of a suspicious download",
    description:
      "Unexpected attachments, misleading file names, and urgent requests. Explore the signals worth checking before you click.",

    image: "phishing",
    imageAlt: "Security workstation showing a suspicious email alert",
  },
  {
    category: "Security basics",
    title: "Look beyond the link: spotting phishing attempts",
    description:
      "A familiar name can hide an unfamiliar destination. Learn how to take a closer look at a URL before trusting it.",

    image: "cloud-security",
    imageAlt: "Cloud security illustration with a protected digital lock",
  },
]

function Dashboard() {
  const { resolvedTheme, setTheme } = useTheme()
  const [tab, setTab] = useState<"message" | "url" | "file">("message")
  const [messageText, setMessageText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState("")
  const [report, setReport] = useState<SecurityReportData | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const analysisInFlight = useRef(false)
  const [query, setQuery] = useState("")
  const hash = useLocation({ select: (location) => location.hash })
  const navigate = useNavigate()
  const submitView = hash === "submit"
  useEffect(() => {
    if (hash === "submit" || hash === "home" || !hash) window.scrollTo(0, 0)
  }, [hash])
  const [message, setMessage] = useState("")
  const [dragging, setDragging] = useState(false)
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(
    null,
  )
  const input = useRef<HTMLInputElement>(null)
  async function submitUrl(content: string) {
    if (analysisInFlight.current) return
    analysisInFlight.current = true
    setAnalyzing(true)
    setReport(null)
    setMessage("Checking URL patterns and reputation…")
    try {
      const analysis = await analyzeUrl(content)
      setReport({ type: "url", content, analysis })
      setMessage("")
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "URL analysis failed. Please try again.",
      )
    } finally {
      analysisInFlight.current = false
      setAnalyzing(false)
    }
  }
  function selectFiles(selected: File[]) {
    if (
      selected.length > 1 ||
      selected.some((file) => file.size > 250 * 1024 * 1024)
    ) {
      setMessage("Please choose one file up to 250 MB.")
      return
    }
    setFiles(selected)
    setMessage("")
  }
  function onDrop(event: DragEvent<HTMLFieldSetElement>) {
    event.preventDefault()
    setDragging(false)
    selectFiles(Array.from(event.dataTransfer.files))
  }
  async function preview() {
    if (analysisInFlight.current) return
    if (tab === "message") {
      if (!messageText.trim()) {
        setMessage("Paste a message to prepare it for analysis.")
        return
      }
      const content = messageText.trim()
      analysisInFlight.current = true
      setAnalyzing(true)
      setMessage("")
      setReport(null)
      try {
        const analysis = await analyzeMessage(content)
        setReport({ type: "message", content, analysis })
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Analysis failed. Please try again.",
        )
      } finally {
        analysisInFlight.current = false
        setAnalyzing(false)
      }
      return
    }
    if (tab === "url") {
      try {
        const parsed = new URL(url)
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error()
        setMessage("")
        await submitUrl(parsed.href)
        return
      } catch {
        setMessage("Enter a valid http:// or https:// URL.")
        return
      }
    }
    if (files[0]) {
      setMessage("")
      setMessage(
        "File analysis is not available yet. Use Message to check text.",
      )
    }
  }
  const showInfo = (title: string, text: string) => setDialog({ title, text })
  return (
    <div className={`threat-home ${submitView ? "submit-view" : ""}`}>
      <header className="threat-header">
        <Link
          className="threat-brand"
          to="/"
          hash="home"
          aria-label="SafeLink AI home"
        >
          <span className="brand-wordmark">
            Safe<span className="brand-link">Link</span>
            <span className="brand-ai">AI</span>
          </span>
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link
            to="/"
            hash="submit"
            aria-current={submitView ? "page" : undefined}
          >
            Check Quick
          </Link>
        </nav>
        <form
          className="header-search"
          aria-label="Search submissions"
          onSubmit={(event) => {
            event.preventDefault()
            void navigate({ to: "/", hash: "community" })
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Search sample submissions"
            placeholder="Search or enter hash…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <nav className="account-nav" aria-label="Resources and account">
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
          <button
            type="button"
            className="settings-button"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </nav>
      </header>
      <main>
        <section className="threat-hero">
          {submitView ? (
            <div className="submit-intro">
              <h1>Let's check it quick quick!</h1>
              <p>
                You get a message, link, or file you're not sure about? Drop it
                here, and let SafeLink AI help you check for bad things.
              </p>
            </div>
          ) : (
            <div className="hero-intro">
              <span className="community-pill">
                <span /> Built for a safer digital world
              </span>
              <h1>
                You see something looking funny?{" "}
                <em>Let's check it quick quick!</em>
              </h1>
              <p>
                You get a message, link, or file you're not sure about? Drop it
                here, and let SafeLink AI help you check for bad things
              </p>
            </div>
          )}
          <div className="analysis-grid">
            <section
              className="analysis-panel"
              id="submit"
              aria-label="Submit for analysis"
            >
              <div
                className="analysis-tabs"
                role="tablist"
                aria-label="Submission type"
              >
                {(["message", "url", "file"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    role="tab"
                    aria-selected={tab === value}
                    aria-controls="submission-panel"
                    id={`${value}-tab`}
                    className={tab === value ? "active" : ""}
                    onClick={() => {
                      setTab(value)
                      setMessage("")
                    }}
                  >
                    {value === "file" ? (
                      <FileText size={16} />
                    ) : value === "message" ? (
                      <MessageCircle size={16} />
                    ) : (
                      <LinkIcon size={16} />
                    )}
                    {value === "message"
                      ? "Message"
                      : value === "url"
                        ? "URL / Link"
                        : "File"}
                  </button>
                ))}
              </div>
              <div
                className="submission-body"
                id="submission-panel"
                role="tabpanel"
                aria-labelledby={`${tab}-tab`}
              >
                {tab === "file" ? (
                  <>
                    <input
                      ref={input}
                      type="file"
                      className="hidden"
                      aria-label="Choose a file"
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        selectFiles(Array.from(event.target.files ?? []))
                      }
                    />
                    <fieldset
                      aria-label="File drop zone"
                      className={`upload-zone ${dragging ? "dragging" : ""}`}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDragging(true)
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                    >
                      <button
                        type="button"
                        className="upload-prompt"
                        onClick={() => input.current?.click()}
                      >
                        <Upload size={32} strokeWidth={2.3} />
                        <strong>
                          {files.length
                            ? files[0].name
                            : "Drag & Drop For Instant Analysis"}
                        </strong>
                        <span>
                          {files.length
                            ? `${(files[0].size / 1024).toFixed(1)} KB · Click to choose another file`
                            : "or click to browse your files"}
                        </span>
                        <small>
                          Maximum upload size: 250 MB · Up to 1 file
                        </small>
                      </button>
                    </fieldset>
                    <p className="file-hint">
                      Executables, documents, scripts — up to 250 MB
                    </p>
                    {files.length > 0 && (
                      <button
                        type="button"
                        className="analyze-button"
                        onClick={preview}
                      >
                        Analyze File <ArrowRight size={15} />
                      </button>
                    )}
                  </>
                ) : tab === "message" ? (
                  <form
                    className="url-entry message-entry"
                    onSubmit={(event) => {
                      event.preventDefault()
                      preview()
                    }}
                  >
                    <MessageCircle size={30} />
                    <h2>Check a Suspicious Message</h2>
                    <p>
                      Paste an email, SMS, or chat message for Gemma 4 analysis.
                      Submitted text is sent to Google AI and saved privately.
                    </p>
                    <textarea
                      aria-label="Message to analyze"
                      placeholder="Paste the suspicious message here…"
                      value={messageText}
                      maxLength={20000}
                      disabled={analyzing}
                      onChange={(event) => {
                        setMessageText(event.target.value)
                        setMessage("")
                      }}
                    />
                    <button
                      type="submit"
                      className="analyze-button"
                      disabled={analyzing}
                      aria-busy={analyzing}
                    >
                      <Rocket size={14} />{" "}
                      {analyzing ? "Analyzing message…" : "Analyze Message"}
                    </button>
                  </form>
                ) : (
                  <form
                    className="url-entry"
                    onSubmit={(event) => {
                      event.preventDefault()
                      preview()
                    }}
                    noValidate
                  >
                    <LinkIcon size={30} />
                    <h2>Paste a URL For Instant Analysis</h2>
                    <p>
                      Paste a website or file URL to prepare it for a threat
                      scan.
                    </p>
                    <input
                      aria-label="URL to analyze"
                      type="url"
                      placeholder="https://www.example.com/suspicious.zip"
                      value={url}
                      onChange={(event) => {
                        setUrl(event.target.value)
                        setMessage("")
                      }}
                    />
                    <button
                      type="submit"
                      className="analyze-button"
                      disabled={analyzing}
                      aria-busy={analyzing}
                    >
                      <Rocket size={14} /> {analyzing ? "Analyzing URL…" : "Analyze URL"}
                    </button>
                  </form>
                )}
                {message && (
                  <p className="submission-message" role="status">
                    {message}
                  </p>
                )}
              </div>
              <div className="submission-security">
                <LockKeyhole size={12} /> Messages and URLs are sent to Google
                services and saved privately. File analysis is coming next.
              </div>
            </section>
            {!submitView && (
              <section className="community-panel" id="community">
                <div className="panel-heading">
                  <h2>Recent community submissions</h2>
                  <button
                    type="button"
                    onClick={() =>
                      showInfo(
                        "Community submissions",
                        "These are sample submissions for the frontend preview. Live community submissions will be available when analysis services are connected.",
                      )
                    }
                  >
                    View submissions <ArrowRight size={12} />
                  </button>
                </div>
                <p className="panel-description">
                  A preview of recently analyzed files shared with the
                  community.
                </p>
                <div className="submission-list">
                  {submissions
                    .filter((hash) => hash.includes(query.trim().toLowerCase()))
                    .map((hash) => (
                      <button
                        type="button"
                        className="submission-row"
                        key={hash}
                        onClick={() =>
                          showInfo(
                            "Sample analysis",
                            `SHA sample: ${hash}. Verdict: Malicious. This is demonstration data, not a live analysis result.`,
                          )
                        }
                      >
                        <span className="file-icon">
                          <FileText size={16} />
                        </span>
                        <span className="hash-info">
                          <strong>{hash}</strong>
                          <small>
                            {hash.slice(0, 23)}…{" "}
                            <span>· &nbsp;1 minute ago</span>
                          </small>
                        </span>
                        <span className="malicious">Malicious</span>
                        <ArrowRight size={14} className="row-arrow" />
                      </button>
                    ))}
                  {!submissions.some((hash) =>
                    hash.includes(query.trim().toLowerCase()),
                  ) && (
                    <p className="no-results">
                      No sample submissions match “{query}”.
                    </p>
                  )}
                </div>
                <span className="sample-label">Sample data</span>
              </section>
            )}
          </div>
        </section>
        {!submitView && (
          <>
            {" "}
            <section
              className="threat-stats"
              aria-label="Example platform statistics"
            >
              <div>
                <span>BEHAVIOR INDICATORS</span>
                <strong>4 K</strong>
              </div>
              <div>
                <span>YARA RULES</span>
                <strong>6 K</strong>
              </div>
              <div>
                <span>TOTAL ANALYSES</span>
                <strong>1 B</strong>
              </div>
              <small>Illustrative platform statistics</small>
            </section>
            <section className="updates-section" id="updates">
              <div className="updates-heading">
                <h2>RELEASES & UPDATES</h2>
                <button
                  type="button"
                  onClick={() =>
                    showInfo(
                      "Resources",
                      "Explore the three introductory articles below. More research and platform updates will be added in a future release.",
                    )
                  }
                >
                  All posts <ExternalLink size={13} />
                </button>
              </div>
              <div className="article-grid">
                {articles.map((article) => (
                  <article className="update-card" key={article.title}>
                    <div
                      className={`article-art ${article.image}`}
                      role="img"
                      aria-label={article.imageAlt}
                    />
                    <div className="article-content">
                      <div className="article-meta">
                        <span>{article.category}</span>
                        <small>5 min read</small>
                      </div>
                      <h3>{article.title}</h3>
                      <p>{article.description}</p>
                      <button
                        type="button"
                        onClick={() =>
                          showInfo(
                            article.title,
                            `${article.description} ${article.category === "Platform updates" ? "This frontend preview includes local file selection, URL validation, and sample submissions. Analysis services will be added separately." : "Verify the sender, inspect the full destination, and be cautious when a message creates urgency. When in doubt, confirm the request through a trusted channel before opening an attachment or following a link."}`,
                          )
                        }
                      >
                        Read article <ExternalLink size={12} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="threat-footer">
        <p>
          © {new Date().getFullYear()} SafeLink AI{" "}
          <span>— &nbsp; Built for better security decisions</span>
        </p>
        <nav aria-label="Footer">
          {[
            "Terms and Conditions",
            "Privacy Notice",
            "Your Privacy Choices",
            "Site Notice",
            "Knowledge Base",
            "FAQ",
          ].map((title) => (
            <button
              type="button"
              key={title}
              onClick={() =>
                showInfo(
                  title,
                  title === "FAQ"
                    ? "Messages and URLs use Gemma 4 through Google AI. URLs also request a Google Safe Browsing lookup; unavailable checks are labeled. Submissions and reports are saved privately. File analysis is not available yet."
                    : `${title} content will be available when SafeLink AI launches. Messages and URLs submitted for analysis are sent to Google services and saved privately. Selected files remain on your device.`,
                )
              }
            >
              {title}
              {title === "Your Privacy Choices" && <ShieldCheck size={12} />}
            </button>
          ))}
        </nav>
      </footer>
      <SecurityReport report={report} onClose={() => setReport(null)} />
      {dialog && (
        <div className="info-overlay">
          <section
            className="info-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            tabIndex={-1}
            ref={(node) => node?.focus()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDialog(null)
            }}
          >
            <button
              type="button"
              className="dialog-close"
              aria-label="Close dialog"
              onClick={() => setDialog(null)}
            >
              <X size={20} />
            </button>
            <Check size={24} className="dialog-icon" />
            <h2 id="info-title">{dialog.title}</h2>
            <p>{dialog.text}</p>
            <button
              type="button"
              className="analyze-button"
              onClick={() => setDialog(null)}
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
