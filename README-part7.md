# Part 7 — Seed Demo Data (+ verified Coupons & Global Search)

A script that populates a fresh database with realistic demo data matching
the spec's "Seed Data" section, so the app isn't empty the first time you
open it. Also includes a full review of two features (Coupons, Global
Search) that turned up already built during this pass — see below.

## What the seed script creates
- **3 grounds** — one indoor, two outdoor, with different pricing tiers
- **3 membership plans** — Basic/Silver/Gold, matching the spec's example numbers
- **5 staff** — one of each non-duplicate role (Manager, Receptionist, Ground
  Staff, Cleaner, Umpire)
- **20 customers** — realistic Pakistani names/phone numbers, some with
  email/address
- **10 teams**, each with 4 players across the four roles
- **30 bookings** — spread across all 3 grounds and ±14 days from today,
  generated with a real conflict check (reuses `rangesOverlap` from Part 2)
  so no two seeded bookings ever double-book a slot, and priced with the
  actual `calculateBookingPrice` helper so peak/weekend rates apply exactly
  as they would for a real booking
- **20 payments** — recorded against bookings that have money paid
- **10 expenses** — one per category from the spec
- **2 tournaments** — one open for registration (future), one completed (past)

## A few additions beyond the exact spec counts
- **One ready-to-use login** — `admin@duckwortharena.pk` / `Admin@12345`
  (arena_manager role, pre-verified) — printed again at the end of the seed run
- **3 active memberships** assigned to the first few customers, so the
  membership-discount logic from Part 5 has something to actually apply
- **3 completed matches** in the past tournament, so the points table (Part 4)
  isn't empty on a fresh database

## Run it
```
npm install
npm run seed
```
Needs `MONGODB_URI` set in `.env.local`. Safe to re-run — it clears the
business-data collections before reseeding but never touches `User` or
`ArenaSettings`, so your own login accounts are untouched.

## How the seed script was verified
No MongoDB is available in this sandbox (no installable package, and the
official download servers aren't reachable from here), so I could **not**
run the seed script against a real database. What I did verify: `npx tsc
--noEmit` type-checks the whole project — including `scripts/seed.ts` —
clean against every real model schema, and `next build` still passes. That
catches wrong field names, bad enum values, and missing required fields, but
it doesn't prove the inserts succeed at runtime. **Please run `npm run
seed` yourself and let me know if anything errors.**

Two real bugs were caught and fixed in `package.json` during this check: a
leftover `seed` script pointing at a `.js` file that was never created (now
correctly runs `scripts/seed.ts` via `tsx`), and a duplicate, version-
mismatched `dotenv` entry in both `dependencies` and `optionalDependencies`.

## Coupons & Global Search — reviewed and confirmed complete
Both of these were found already built in the previous pass but not yet
reviewed. I've now read every line of both end-to-end:

- **Coupons** (`models/Coupon.ts`, `/api/coupons`, `/dashboard/coupons`) —
  percentage or fixed discount codes with start/expiry dates and a usage
  limit. `lib/coupons.ts` validates a code (active, in-date, under its usage
  limit) and only increments the usage counter *after* a booking actually
  succeeds, so a failed booking attempt never burns a redemption. It's fully
  wired into **both** booking flows — the staff calendar (Part 2) and the
  customer self-service portal (Part 6) — matching the spec's "coupon
  discount should automatically apply" rule and the "apply discount/coupon"
  step in the online booking flow.
- **Global search** (`/api/search`, `/dashboard/search`) — one search box
  across bookings, customers, teams, grounds, and payments (matched via their
  customer, since payments don't carry a name themselves), exactly matching
  the spec's "Search" section. Both are correctly linked in the sidebar nav.

Both are staff-gated (`requireStaff`), type-check clean, and build clean —
same standard as everything else in this project.
