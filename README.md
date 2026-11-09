# 🏏 Cricket Arena Management System

A full-stack cricket arena and club management platform built with **Next.js 14, React, TypeScript, MongoDB, and Mongoose**. It provides tools for managing grounds, bookings, customers, teams, players, matches, tournaments, staff, equipment, payments, memberships, and a customer self-service portal.

## ✨ Features

### Arena administration
- Dashboard with arena management sections
- Manage grounds, facilities, opening hours, and pricing
- Booking calendar with availability and server-side double-booking prevention
- Customer profiles, booking history, and customer statistics
- Staff records and attendance tracking
- Equipment inventory with issue/return tracking
- Maintenance scheduling that makes affected grounds unavailable
- Arena settings and in-app notifications

### Cricket management
- Create and manage teams and player rosters
- Schedule matches and update live scores
- Track match results and team win/loss records
- Create tournaments and register teams
- Automatically calculate tournament points tables and net run rate

### Business and customer features
- Payment transaction records and expense tracking
- Membership plans and membership discounts
- Coupons and global dashboard search
- Customer portal for browsing grounds, booking slots, viewing bookings, memberships, and tournaments
- Authentication with email OTP verification and password reset
- Role-based access for administrators, arena managers, staff, and customers

## 🧰 Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js Route Handlers / API routes
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT, bcryptjs, email OTP
- **Email:** Nodemailer / SMTP
- **Icons:** lucide-react
- **Optional media storage:** Cloudinary

## 🚀 Getting Started

### 1. Prerequisites

Install:
- Node.js (LTS recommended)
- npm
- A MongoDB database (MongoDB Atlas or local MongoDB)

### 2. Clone the repository

```bash
git clone https://github.com/Alihassan75/Cricket-club.git
cd Cricket-club
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a file named `.env.local` in the project root and add your own values:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=Cricket Arena <your-email@gmail.com>

NEXT_PUBLIC_APP_NAME=Cricket Arena

# Optional: configure Cloudinary for persistent uploaded media
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**Important:**
- Never commit `.env`, `.env.local`, or real credentials to GitHub.
- Create a MongoDB database and allow your deployment/server IP access in MongoDB Atlas.
- For Gmail SMTP, use a Google App Password where applicable, not your normal account password.
- Generate a strong, unique `JWT_SECRET`.
- Add the same required variables to your hosting provider's environment-variable settings.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Create a production build

```bash
npm run build
npm run start
```

## 🗃️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Build the production application |
| `npm run start` | Run the production build |
| `npm run lint` | Run the configured Next.js lint command |
| `npm run seed` | Populate MongoDB with sample arena data |
| `npm run setup:indoor` | Run the indoor-arena setup script |
| `npm run make:admin -- <email>` | Promote an existing account to super admin |
| `npm run make:admin -- <email> "<password>" "<name>"` | Create a super-admin account |

> **Seed warning:** `npm run seed` clears and recreates several business-data collections. Review `scripts/seed.ts` and use it only with a database where replacing that demo data is acceptable. It does not clear the User collection.

## 👤 User Roles

The application includes role-based access for:
- `super_admin`
- `arena_manager`
- `staff`
- `customer`

Customer accounts use the customer portal, while authorized staff and administrators use the management dashboard.

## ☁️ Deployment

This project is designed to deploy on [Vercel](https://vercel.com/) with MongoDB hosted separately, for example on [MongoDB Atlas](https://www.mongodb.com/atlas).

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Set the required environment variables in **Vercel → Project → Settings → Environment Variables**.
4. Ensure MongoDB Atlas allows connections from your deployment.
5. Deploy the project.
6. Configure Cloudinary (recommended for persistent uploaded files) and add its environment variables if the application uses it.

**File uploads:** Do not rely on a serverless deployment's local filesystem for permanent user uploads. Configure persistent object/media storage such as Cloudinary. Also check any existing upload routes before production deployment.

## 📁 Project Structure

```text
.
├── app/
│   ├── (site)/       # Public website pages
│   ├── api/           # Backend API route handlers
│   ├── dashboard/     # Arena management pages
│   └── portal/        # Customer portal pages
├── components/        # Reusable React components
├── lib/               # Database, auth, booking, and business logic
├── models/            # Mongoose models
├── public/            # Static assets
├── scripts/           # Database setup and admin scripts
├── middleware.ts      # Route protection and role routing
├── package.json
└── README.md
```

## 🔐 Security Notes

- Keep all secrets in local environment files or hosting-provider environment settings.
- Do not upload `.env` files, database credentials, SMTP passwords, or JWT secrets.
- Use strong passwords and a unique JWT secret in production.
- Restrict MongoDB network access appropriately.
- Review admin creation and demo seeding scripts before running them on production data.

## 🤝 Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m "Add your feature"`.
4. Push the branch: `git push origin feature/your-feature`.
5. Open a Pull Request.

## 📄 License

No license has been specified yet. Add a `LICENSE` file if you want to publish this project under an open-source license.
