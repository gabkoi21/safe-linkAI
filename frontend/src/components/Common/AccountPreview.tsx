import { Link } from "@tanstack/react-router"
import { ArrowLeft, Moon, Sun } from "lucide-react"
import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import "./account-preview.css"

export default function AccountPreview({ mode }: { mode: "login" | "signup" }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [email, setEmail] = useState(() =>
    mode === "login"
      ? (localStorage.getItem("safelink-remembered-email") ?? "")
      : "",
  )
  const [remember, setRemember] = useState(
    () =>
      mode === "login" &&
      Boolean(localStorage.getItem("safelink-remembered-email")),
  )
  const [name, setName] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [policy, setPolicy] = useState("")
  const signup = mode === "signup"
  return (
    <div className="account-page">
      <header className="account-topbar">
        <Link to="/" hash="home" className="account-home">
          <ArrowLeft size={15} /> SafeLink <span>AI</span>
        </Link>
        <button
          type="button"
          className="account-theme"
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>
      <main
        className={`account-content ${signup ? "account-signup" : "account-login"}`}
      >
        <div className="account-intro">
          <h1>
            {signup ? (
              <>
                Sign up for a <span>free account</span>
              </>
            ) : (
              "Login"
            )}
          </h1>
          {signup ? (
            <>
              <p>
                Create a free account to keep your checks in one place and make
                your next security decision with confidence.
              </p>
              <p>
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </>
          ) : (
            <p>
              Don't have an account? <Link to="/signup">Sign up for free</Link>
            </p>
          )}
        </div>
        <form
          className={
            signup ? "account-form account-registration" : "account-form"
          }
          onSubmit={(event) => {
            event.preventDefault()
            setError("")
            setNotice("")
            if (signup && password !== confirm) {
              setError("The passwords don't match.")
              return
            }
            if (!signup) {
              if (remember)
                localStorage.setItem("safelink-remembered-email", email.trim())
              else localStorage.removeItem("safelink-remembered-email")
            }
            setNotice(
              signup
                ? "Your form is ready. This is a frontend preview; no account has been created and your password has not been sent or saved."
                : "Your email is ready. Login will continue when account services are connected. You are not signed in.",
            )
          }}
        >
          {signup && (
            <>
              <h2>Account Information</h2>
              <label className="account-field">
                {" "}
                <span>
                  Name<span className="account-required">*</span>
                </span>
                <input
                  name="username"
                  autoComplete="username"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={50}
                  required
                />
                <small>{name.length}/50</small>
              </label>
              <label className="account-field">
                <span>Full Name</span>
                <input
                  name="full_name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={200}
                />
                <small>{fullName.length}/200</small>
              </label>
            </>
          )}
          <label className="account-field">
            <span>
              Email<span className="account-required">*</span>
            </span>
            <input
              name="email"
              data-testid="email-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setNotice("")
              }}
            />
          </label>
          {signup ? (
            <>
              <div className="account-passwords">
                <label className="account-field">
                  <span>
                    Password<span className="account-required">*</span>
                  </span>
                  <input
                    data-testid="password-input"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError("")
                    }}
                  />
                  <small>At least 8 characters</small>
                </label>
                <label className="account-field">
                  <span>
                    Confirm Password<span className="account-required">*</span>
                  </span>
                  <input
                    type="password"
                    name="confirm_password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirm}
                    onChange={(event) => {
                      setConfirm(event.target.value)
                      setError("")
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "account-error" : undefined}
                  />
                </label>
              </div>
              <div className="account-consent">
                <label>
                  <input type="checkbox" required name="terms" />
                  <span>
                    I agree to SafeLink AI's{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setPolicy(
                          "Terms and Conditions: This is a frontend preview. Account creation and analysis services are not connected. Full terms will be available before launch.",
                        )
                      }
                    >
                      Terms and Conditions of Use
                    </button>{" "}
                    and have read the{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setPolicy(
                          "Privacy Notice: This form does not submit your details or password to a server. On the login page, selecting Remember my email saves only your email in this browser.",
                        )
                      }
                    >
                      Privacy Notice
                    </button>
                    . I will only submit information I am authorized to share.
                    <span className="account-required">*</span>
                  </span>
                </label>
                {policy && (
                  <p className="account-policy" role="status">
                    {policy}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <label className="account-field">
                <span>
                  Password<span className="account-required">*</span>
                </span>
                <input
                  type="password"
                  name="password"
                  data-testid="password-input"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setNotice("")
                  }}
                />
              </label>
              <label className="account-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember my email
              </label>
            </>
          )}
          {error && (
            <p className="account-error" id="account-error" role="alert">
              {error}
            </p>
          )}
          <button className="account-continue" type="submit">
            {signup ? "Sign Up" : "Continue"}
          </button>
          {notice && (
            <p className="account-notice" role="status">
              {notice}
            </p>
          )}
        </form>
      </main>
    </div>
  )
}
