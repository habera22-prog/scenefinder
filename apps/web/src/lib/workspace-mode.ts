import type { UserRole } from "./types";

export function resolveWorkspaceMode(
  path: string,
  bookingRole: string | null,
  stored: "customer" | "photographer",
  role?: UserRole,
) {
  if (role !== "photographer") return "customer";
  if (
    path === "/studio" ||
    path.startsWith("/studio/") ||
    path === "/photographers/apply" ||
    path === "/me/settlements"
  )
    return "photographer";
  if (
    path === "/me/bookings" &&
    (bookingRole === "photographer" || bookingRole === "customer")
  )
    return bookingRole;
  if (
    /^\/bookings\/[^/]+$/.test(path) &&
    (bookingRole === "photographer" || bookingRole === "customer")
  )
    return bookingRole;
  if (
    [
      "/",
      "/photographers",
      "/navigator",
      "/me/favorites",
      "/me/photos",
    ].includes(path) ||
    /^\/photographers\/[^/]+$/.test(path)
  )
    return "customer";
  return stored;
}
