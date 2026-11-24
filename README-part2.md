# Part 2 — Grounds & Booking Core

Builds on Part 1. Adds ground management and a real booking calendar with
server-enforced double-booking prevention.

## New API routes
- `GET/POST /api/grounds` — list / create grounds (staff-only)
- `GET/PATCH/DELETE /api/grounds/[id]` — view/update a ground; DELETE soft-disables it (keeps booking history intact)
- `GET /api/grounds/[id]/slots?date=YYYY-MM-DD` — splits opening hours into slots, marks each available/booked/maintenance
- `GET/POST /api/bookings` — list (with filters) / create a booking
- `GET/PATCH /api/bookings/[id]` — view/update a booking (status, payment)

## Business rules implemented
1. **Double-booking prevention** — re-checked server-side on every `POST /api/bookings`
   (`app/api/bookings/route.ts`), not just in the UI, so two people can't grab the
   same slot in a race. Overlap check: `lib/time.ts` → `rangesOverlap()`.
2. **Automatic pricing** — `lib/pricing.ts` applies weekend rate and blends in
   peak-hour rate proportionally to how much of the booking falls in the peak window.
3. **Maintenance blocks bookings** — a ground with `status: "maintenance"` or
   `"disabled"` marks every slot unavailable (`lib/timeSlots.ts`).
4. **Cancelling frees the slot automatically** — availability queries only count
   `Pending | Confirmed | Completed` bookings; `Cancelled`/`No Show` are excluded,
   so no extra cleanup step is needed.
5. **Role-based access** — `lib/guard.ts` restricts grounds/bookings management to
   `super_admin`, `arena_manager`, `staff` (customers can't hit these routes).

## New pages
- `/dashboard` — now wrapped in a real sidebar shell (`components/DashboardShell.tsx`)
- `/dashboard/grounds` — add/edit grounds, set pricing & facilities, mark maintenance/disable
- `/dashboard/calendar` — pick a ground + date, see live slot grid, book directly from an open slot

## Try it
1. Sign in (from Part 1)
2. Go to **Grounds** → add a ground (set price/hr, weekend price, peak price, hours)
3. Go to **Booking Calendar** → pick that ground + today's date → tap an open slot → fill customer details → confirm
4. Try booking the same slot again — you'll get the double-booking error from the server
