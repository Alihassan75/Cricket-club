# Part 6 — Staff, Equipment, Maintenance, Notifications, Settings & Customer Portal

The final part. Builds on Parts 1-5. Adds staff/attendance, equipment
inventory with issue/return, a maintenance log that automatically blocks
booking, in-app notifications, arena-wide settings, and a full separate
customer-facing portal.

## New models
- `models/Staff.ts` — the 6 roles from the spec, salary, joining date, shift, status
- `models/Attendance.ts` — one row per staff member per day; check-in/out
  auto-computes working hours
- `models/Equipment.ts` — inventory (quantity/available/damaged/condition) +
  `EquipmentIssue` sub-model for issuing gear to a customer or team and
  tracking returns
- `models/Maintenance.ts` — ground or equipment maintenance log
- `models/Notification.ts` — in-app notifications, either arena-wide (no
  recipient) or addressed to a specific portal user
- `models/ArenaSettings.ts` — singleton: name, contact info, currency, tax,
  hours, booking rules, cancellation policy, advance-payment %, social links
- `models/Customer.ts` extended with an optional `user` link, so a portal
  login and a staff-created customer profile are the same record

## Business logic
- **Maintenance blocks bookings automatically**: scheduling maintenance on a
  ground sets it to `status: "maintenance"` immediately (the booking calendar
  from Part 2 already refuses bookings on non-active grounds); marking the
  maintenance `Completed` restores it to `active`.
- **Equipment issue/return**: issuing moves units from `availableQuantity`
  into circulation; returning them restores the count. Can't issue more than
  what's available.
- **Notifications fire from real events**, not just on a schedule: booking
  confirmation and cancellation, and tournament match scheduling, all call
  `lib/notifications.ts` from their existing routes (Parts 2-4) — no
  duplicate logic, just a hook added to what was already there.
- **Portal ↔ staff data is the same data**: `lib/portalCustomer.ts` links a
  customer's portal login to their `Customer` profile (matching by phone if
  staff already created one from an in-person booking, or creating fresh
  otherwise) — so a customer's booking history is identical whether staff
  entered it or they booked it themselves.

## New API routes
- `GET/POST /api/staff`, `PATCH/DELETE /api/staff/[id]`, `GET/POST /api/staff/[id]/attendance`
- `GET/POST /api/equipment`, `PATCH/DELETE /api/equipment/[id]`, `GET/POST/PATCH /api/equipment/[id]/issue`
- `GET/POST /api/maintenance`, `PATCH /api/maintenance/[id]`
- `GET/PATCH /api/notifications`
- `GET/PATCH /api/settings`
- **Customer portal** (all `requireAuth`, not staff-gated):
  `GET /api/portal/grounds`, `GET /api/portal/grounds/[id]/slots`,
  `GET/POST /api/portal/bookings`, `POST /api/portal/bookings/[id]/cancel`,
  `GET /api/portal/membership`, `GET /api/portal/tournaments`,
  `POST /api/portal/tournaments/[id]/register`, `GET /api/portal/teams`,
  `GET/PATCH /api/portal/profile`

## New pages
- `/dashboard/staff` — roster + one-tap check-in/check-out
- `/dashboard/equipment` — inventory cards with issue flow
- `/dashboard/maintenance` — schedule + status flow (Scheduled → In Progress → Completed)
- `/dashboard/notifications` — unread-highlighted feed, mark read / mark all read
- `/dashboard/settings` — the singleton arena settings form
- **`/portal/*`** — a completely separate customer-facing app with its own
  shell (`components/PortalShell.tsx`): overview, browse grounds, book a slot
  (self-service, starts as `Pending` until staff/payment confirms it), booking
  history + cancel, membership view, tournament browsing + team registration,
  and profile editing

## Role routing
- `middleware.ts` sends customer-role logins to `/portal` and keeps them out
  of `/dashboard`; staff/admin can still visit `/portal` if they want to book
  for themselves.
- Login and email-verification now redirect based on the actual role in the
  server's response, instead of always going to `/dashboard` and relying on
  a middleware bounce.

## Build-tested — 2 real bugs caught and fixed
`next build` failed on the first attempt: `lucide-react` was used in
`components/PortalShell.tsx` but was never added to `package.json`. Added it,
reinstalled, rebuilt — clean. All 64 routes compile, 0 type errors. This is
the same "actually build it" check every part has gotten.

## Try it
1. **Register** a brand-new account (don't touch the DB) → verify OTP → you
   land in `/portal` automatically, not the staff dashboard
2. **Portal → Grounds → book a slot** → it shows up in **Portal → My
   Bookings** as `Pending`
3. Switch to a staff account → **Dashboard → Bookings** → find that booking →
   confirm/complete it
4. **Dashboard → Maintenance** → schedule maintenance on a ground → check
   **Grounds** or the booking calendar — that ground is now unavailable →
   mark the maintenance **Completed** → it's bookable again
5. **Dashboard → Equipment** → add an item → issue some units → confirm the
   available count drops
6. **Dashboard → Notifications** → confirm the booking and maintenance
   events from above appear
