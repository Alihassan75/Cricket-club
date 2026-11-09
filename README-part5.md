# Part 5 — Payments, Expenses, Memberships & Reports

Builds on Parts 1-4. Adds a payment transaction ledger, expense tracking,
a real membership system that auto-discounts bookings, and a reports page
with CSV export.

## New models
- `models/Payment.ts` — one row per transaction against a booking (method,
  status, date) — separate from the booking's aggregate advance/remaining
  fields, so you get a real audit trail and can print a receipt per payment
- `models/Expense.ts` — title, category (10 categories from the spec), amount,
  date, description
- `models/MembershipPlan.ts` — package name, price, duration, discount %,
  hours/month, benefits list
- `models/CustomerMembership.ts` — a customer's subscription to a plan:
  start/expiry dates, hours allotted vs. used, status

## Business logic
- **Payments keep bookings in sync**: `POST /api/payments` records a
  transaction *and* updates the booking's `advancePayment` /
  `remainingPayment` / `paymentStatus` — you can't overpay past what's owed
  (rejected with the exact remaining balance).
- **Refunds reverse cleanly**: `PATCH /api/payments/[id]` with
  `{status:"Refunded"}` flips the transaction and subtracts it back out of
  the booking's paid total.
- **Membership discount auto-applies** (`lib/membership.ts`): every new
  booking now checks the customer's active membership; if they have enough
  remaining hours this cycle, the plan's discount % is applied automatically
  on top of any manual discount, and the hours are deducted. This is wired
  directly into `POST /api/bookings` from Part 2/3.
- **Default plans auto-seed**: the three example packages from the spec
  (Basic/Silver/Gold — 5/10/20 hrs, 5/10/15% off) are created automatically
  the first time `/api/memberships/plans` is called, so the page is never
  empty on a fresh database.
- **Revenue formula matches the spec** (`lib/reports.ts`):
  `revenue = booking payments + membership sales + tournament entry fees`,
  `profit = revenue - expenses`, computed live for any date range — nothing
  is pre-aggregated or can drift out of sync.

## New API routes
- `GET/POST /api/payments`, `GET/PATCH /api/payments/[id]` (refund)
- `GET/POST /api/expenses`, `PATCH/DELETE /api/expenses/[id]`
- `GET/POST /api/memberships/plans`
- `GET/POST /api/memberships`, `PATCH /api/memberships/[id]` (cancel)
- `GET /api/reports/summary?from=&to=` — revenue/expense/profit breakdown
- `GET /api/reports/export?type=bookings|payments|expenses|customers&from=&to=`
  — streams a CSV file (no extra dependency; `lib/csv.ts` is a ~15-line helper)

## New pages
- `/dashboard/payments` — search a booking with a balance owed, record a
  payment, and print a receipt (browser print dialog, styled for paper)
- `/dashboard/expenses` — add/delete expenses, running "this month" total
- `/dashboard/memberships` — plan cards, assign a plan to a customer, see
  every active/past membership with hours used
- `/dashboard/reports` — date-range revenue/expense/profit cards, a revenue
  breakdown, and one-click CSV downloads for four report types

## Build-tested
`next build` passed clean on the first attempt this time — 41 routes, 0 type
errors, only the pre-existing (harmless) jsonwebtoken Edge Runtime warnings
from Part 1.

## Try it
1. **Memberships** → the three default plans appear automatically → assign
   Gold to a customer who's already booked before
2. **Booking Calendar** (Part 2) → book that customer again → the total
   should come back lower than the sticker price (15% membership discount
   applied automatically) and their remaining hours drop
3. **Payments** → search that customer → record a partial payment → print
   the receipt
4. **Expenses** → add a few, check the "this month" total updates
5. **Reports** → set a date range covering your test data → confirm revenue,
   expenses, and profit look right → download a CSV
