# Part 1 — Authentication (Next.js, real backend)

Everything here is real, working code — not a demo. It needs a MongoDB
database and (optionally) SMTP credentials to send real emails.

## What's included
- `POST /api/auth/register` — creates an unverified user, emails a 6-digit OTP
- `POST /api/auth/verify-otp` — confirms the OTP, marks email verified, logs the user in (JWT cookie)
- `POST /api/auth/resend-otp` — reissues a code for either `verify_email` or `reset_password`
- `POST /api/auth/login` — bcrypt password check, blocks unverified accounts
- `POST /api/auth/forgot-password` — emails a reset OTP (doesn't leak whether the email exists)
- `POST /api/auth/reset-password` — verifies OTP, sets new password
- `POST /api/auth/logout` — clears the auth cookie
- `GET  /api/auth/me` — returns the logged-in user from the JWT cookie
- `middleware.ts` — blocks `/dashboard/*` for logged-out users, blocks auth pages for logged-in users
- Pages: `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/dashboard` (placeholder)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` — a MongoDB Atlas (or local) connection string
   - `JWT_SECRET` — any long random string
   - `SMTP_*` — real SMTP credentials (Gmail app password, SendGrid, Mailgun, etc.)
     - **If you skip SMTP for now**, OTP codes are just printed to your terminal
       (`[DEV] OTP for ... : 123456`) so you can still test the full flow locally.
3. `npm run dev` → open `http://localhost:3000`

## Data model
`models/User.ts` — one collection, four roles (`super_admin`, `arena_manager`,
`staff`, `customer`), OTP fields stored hashed (never plaintext) with a
10-minute expiry and a 5-attempt lockout before a new code is required.

## Security notes
- Passwords hashed with bcrypt (cost 10)
- OTP codes hashed with SHA-256 before storage — even a DB leak doesn't expose codes
- JWT stored in an `httpOnly`, `sameSite=lax` cookie — not accessible to client JS
- Forgot-password never reveals whether an email has an account
