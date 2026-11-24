# Part 3 — Bookings & Customers

Builds on Parts 1 & 2. Adds a full booking management view beyond the
calendar, plus real customer profiles that build themselves from booking
activity.

## New model
- `models/Customer.ts` — fullName, phone (unique key), whatsapp, email,
  address, totalBookings, totalSpending, membershipStatus, favoriteTimeSlot, notes

## Booking ↔ Customer linking
- `Booking` now has an optional `customer` ref.
- `lib/customers.ts`:
  - `findOrCreateCustomer(name, phone)` — matches by phone on every new
    booking; creates a profile on first booking, never overwrites an
    existing one.
  - `recalculateCustomerStats(customerId)` — recomputes totalBookings,
    totalSpending, and favoriteTimeSlot (most-booked start hour) from that
    customer's active bookings. Runs after every booking create, and after
    any status/payment change (so cancelling a booking correctly drops it
    out of their spend total).

## New API routes
- `GET/POST /api/customers` — search by name/phone/email; manual add
- `GET/PATCH /api/customers/[id]` — profile view/edit
- `GET /api/customers/[id]/bookings` — full booking history for that customer

## Changed API routes
- `POST /api/bookings` — now links/creates the customer and recalculates
  their stats after creating the booking
- `PATCH /api/bookings/[id]` — recalculates customer stats when status or
  payment changes
- `GET /api/bookings` — new filters: `paymentStatus`, `customerId`,
  `dateFrom`/`dateTo` range; `customer` search now also matches phone

## New pages
- `/dashboard/bookings` — full list, filterable by ground, status, payment
  status, date range, and customer search; a "Manage" modal to change status,
  payment status, and advance paid
- `/dashboard/customers` — searchable list, manual "Add customer"
- `/dashboard/customers/[id]` — profile (editable) + stat cards (bookings,
  spending, favorite time slot) + full booking history table

## Try it
1. Book a slot via the **Booking Calendar** (from Part 2) with a real name/phone
2. Go to **Customers** — that person now has a profile with 1 booking and their spend
3. Go to **Bookings** → filter by that customer or by payment status → hit **Manage**
   → mark it **Cancelled** → go back to their customer profile: totals drop automatically
