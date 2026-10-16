import type { UserPublic } from "@/client"

export const guestMode =
  import.meta.env.DEV && import.meta.env.VITE_SKIP_LOGIN === "true"

export const guestUser: UserPublic = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "guest@example.com",
  full_name: "Guest",
  is_active: true,
  is_superuser: false,
}
