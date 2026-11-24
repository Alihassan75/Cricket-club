/** The three parts of the system. Accounts keep their stored role; these are the names people see. */
export type Role = "super_admin" | "arena_manager" | "staff" | "customer";

export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Backyard Manager",
  arena_manager: "Arena Manager",
  staff: "Arena Staff",
  customer: "Player",
};
export const ROLE_BLURB: Record<string, string> = {
  super_admin: "Controls the whole website: managers, settings, play requests and every arena page.",
  arena_manager: "Runs the arena day to day: bookings, grounds, tournaments, teams, payments and memberships.",
  staff: "Front-desk helper: the same arena pages as the manager.",
  customer: "Uses our services: books grounds, enters tournaments, gets a membership.",
};

export const STAFF_ROLES: Role[] = ["super_admin", "arena_manager", "staff"];
export const isBackyard = (role?: string) => role === "super_admin";

/** Dashboard pages only the Backyard Manager may open. */
export const BACKYARD_ONLY_PATHS = [
  "/dashboard/managers", "/dashboard/settings", "/dashboard/arenas", "/dashboard/inquiries",
  "/dashboard/memberships", "/dashboard/clients", "/dashboard/staff", "/dashboard/equipment", "/dashboard/maintenance",
  "/dashboard/expenses", "/dashboard/reports", "/dashboard/coupons", "/dashboard/search",
];
/** Server routes that are not split per arena yet — only the Backyard Manager may call them. */
export const BACKYARD_ONLY_API = [
  "/api/memberships", "/api/staff", "/api/equipment", "/api/maintenance", "/api/expenses",
  "/api/reports", "/api/coupons", "/api/search",
];

/** Which login tab an account belongs to. */
export type Portal = "user" | "arena" | "backyard";
export const portalOf = (role: string): Portal => (role === "customer" ? "user" : role === "super_admin" ? "backyard" : "arena");
export const PORTAL_NAME: Record<Portal, string> = { user: "Player", arena: "Arena manager", backyard: "Backyard manager" };
