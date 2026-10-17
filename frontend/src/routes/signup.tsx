import { createFileRoute } from "@tanstack/react-router"
import AccountPreview from "@/components/Common/AccountPreview"

export const Route = createFileRoute("/signup")({
  component: () => <AccountPreview mode="signup" />,
  head: () => ({ meta: [{ title: "Sign Up — SafeLink AI" }] }),
})
