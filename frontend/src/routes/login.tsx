import { createFileRoute } from "@tanstack/react-router"
import AccountPreview from "@/components/Common/AccountPreview"

export const Route = createFileRoute("/login")({
  component: () => <AccountPreview mode="login" />,
  head: () => ({ meta: [{ title: "Login — SafeLink AI" }] }),
})
