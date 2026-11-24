import type { ZodError } from "zod";

const LABELS: Record<string, string> = {
  fullName: "Full name", phone: "Phone number", whatsapp: "WhatsApp number", email: "Email", password: "Password",
  startDate: "Start date", endDate: "End date", numberOfTeams: "Number of teams", entryFee: "Entry fee", prizeMoney: "Prize money",
  pricePerHour: "Price per hour", groundNumber: "Ground number", openingTime: "Opening time", closingTime: "Closing time",
  startTime: "Start time", endTime: "End time", customerName: "Customer name", teamA: "Team A", teamB: "Team B",
  captainName: "Captain name", jerseyNumber: "Jersey number", packageName: "Package name", logoUrl: "Logo",
};

const pretty = (key: string) => LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/** Default zod messages are cryptic ("String must contain at least 2 character(s)"); custom ones are kept as written. */
const DEFAULT_MSG = /^(String must contain|Number must be|Required$|Expected |Invalid enum value|Invalid input|Invalid email|Invalid date|Array must contain)/;

/**
 * Turns the first validation problem into a sentence a person can act on,
 * e.g. "Tournament name must be at least 2 characters." Pass `labels` to rename fields for one form.
 */
export function zodMessage(err: ZodError, labels: Record<string, string> = {}): string {
  const issue = err.issues[0];
  if (!issue) return "Please check the details and try again.";
  if (!DEFAULT_MSG.test(issue.message)) return issue.message; // already a human message
  const key = String(issue.path[issue.path.length - 1] ?? "");
  const label = labels[key] || pretty(key || "This field");
  const anyIssue = issue as any;

  if (issue.code === "invalid_type") {
    return anyIssue.received === "undefined" || anyIssue.received === "null"
      ? `${label} is required.`
      : `${label} is not valid — expected ${anyIssue.expected}.`;
  }
  if (issue.code === "too_small") {
    const min = Number(anyIssue.minimum);
    if (anyIssue.type === "string") return min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`;
    if (anyIssue.type === "number") {
      if (anyIssue.inclusive === false) return `${label} must be greater than ${min}.`;
      return min === 0 ? `${label} can't be negative.` : `${label} must be at least ${min}.`;
    }
    if (anyIssue.type === "array") return `Add at least ${min} item(s) to ${label.toLowerCase()}.`;
  }
  if (issue.code === "too_big") {
    const max = Number(anyIssue.maximum);
    return anyIssue.type === "string" ? `${label} must be at most ${max} characters.` : `${label} must be at most ${max}.`;
  }
  if (issue.code === "invalid_enum_value") return `${label}: please choose one of the listed options.`;
  if (issue.code === "invalid_string" && anyIssue.validation === "email") return "Enter a valid email address.";
  return `${label}: ${issue.message}`;
}
