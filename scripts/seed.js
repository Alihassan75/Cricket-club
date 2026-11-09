/**
 * Seed script — populates demo data matching the spec:
 * 3 grounds, 20 customers, 10 teams, 30 bookings, 5 staff, 20 payments,
 * 10 expenses, 2 tournaments, 3 membership plans, plus one ready-to-use
 * arena manager login.
 *
 * Run with: npm run seed
 * Safe to re-run — skips any collection that already has data, so it won't
 * duplicate records on a database you're already using.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}

// Loose schemas (strict: false) — this script only needs to write data the
// real app's models (in /models) can already read; it doesn't need every
// virtual or validator they define.
const S = (name, defs) => mongoose.model(name, new mongoose.Schema(defs, { timestamps: true, strict: false }));

const User = S("User", { name: String, email: String, passwordHash: String, role: String, isEmailVerified: Boolean });
const Ground = S("Ground", {});
const Customer = S("Customer", {});
const Team = S("Team", {});
const Booking = S("Booking", {});
const Staff = S("Staff", {});
const Payment = S("Payment", {});
const Expense = S("Expense", {});
const Tournament = S("Tournament", {});
const MembershipPlan = S("MembershipPlan", {});

const FIRST_NAMES = ["Ahmed", "Bilal", "Hassan", "Usman", "Faisal", "Imran", "Kashif", "Zeeshan", "Adeel", "Waqas", "Saad", "Talha", "Hamza", "Owais", "Rizwan", "Junaid", "Shoaib", "Farhan", "Nabeel", "Asad"];
const LAST_NAMES = ["Khan", "Ali", "Malik", "Butt", "Sheikh", "Raza", "Iqbal", "Hussain", "Ahmed", "Chaudhry"];
const TEAM_NAMES = ["Shaheen Warriors", "Lahore Lions", "Punjab Panthers", "Gujranwala Gladiators", "Iron Strikers", "Falcon XI", "Thunder Kings", "Royal Challengers", "City Strikers", "Al-Noor Academy"];
const CATEGORIES = ["Electricity", "Rent", "Staff Salary", "Ground Maintenance", "Cricket Equipment", "Internet", "Marketing", "Cleaning", "Repairs", "Other"];
const METHODS = ["Cash", "Bank Transfer", "Card", "JazzCash", "EasyPaisa"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function dateOffset(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function pad(n) { return String(n).padStart(2, "0"); }

async function seedAdmin() {
  if (await User.countDocuments() > 0) return console.log("Users already exist, skipping.");
  const passwordHash = await bcrypt.hash("Password123!", 10);
  await User.create({
    name: "Arena Admin",
    email: "admin@duckworthcricket.pk",
    passwordHash,
    role: "arena_manager",
    isEmailVerified: true,
  });
  console.log("Seeded admin login: admin@duckworthcricket.pk / Password123!");
}

async function seedGrounds() {
  if (await Ground.countDocuments() > 0) return (await Ground.find()).map((g) => g._id);
  const grounds = await Ground.insertMany([
    { name: "Ground A - Indoor", groundNumber: "A1", surface: "indoor", size: "70x40 ft", capacity: 20, facilities: ["Flood lights", "Nets", "Changing room", "Air conditioning"], pricePerHour: 3000, weekendPricePerHour: 3500, peakHourPricePerHour: 4000, peakHourStart: "18:00", peakHourEnd: "22:00", openingTime: "08:00", closingTime: "23:00", status: "active" },
    { name: "Ground B - Outdoor", groundNumber: "B1", surface: "outdoor", size: "90x60 ft", capacity: 30, facilities: ["Flood lights", "Parking", "Washroom", "Seating area"], pricePerHour: 2000, weekendPricePerHour: 2500, peakHourPricePerHour: 2800, peakHourStart: "17:00", peakHourEnd: "21:00", openingTime: "07:00", closingTime: "22:00", status: "active" },
    { name: "Ground C - Outdoor", groundNumber: "C1", surface: "outdoor", size: "90x60 ft", capacity: 30, facilities: ["Nets", "Bowling machine", "Scoreboard"], pricePerHour: 2200, weekendPricePerHour: 2700, peakHourPricePerHour: 3000, peakHourStart: "17:00", peakHourEnd: "21:00", openingTime: "07:00", closingTime: "22:00", status: "active" },
  ]);
  console.log(`Seeded ${grounds.length} grounds.`);
  return grounds.map((g) => g._id);
}

async function seedCustomers() {
  if (await Customer.countDocuments() > 0) return (await Customer.find()).map((c) => c._id);
  const docs = Array.from({ length: 20 }).map((_, i) => {
    const name = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;
    return {
      fullName: name,
      phone: `03${randInt(0, 9)}${randInt(1000000, 9999999)}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}${i}@example.com`,
      totalBookings: 0,
      totalSpending: 0,
      membershipStatus: "none",
    };
  });
  const customers = await Customer.insertMany(docs);
  console.log(`Seeded ${customers.length} customers.`);
  return customers.map((c) => c._id);
}

async function seedTeams() {
  if (await Team.countDocuments() > 0) return (await Team.find()).map((t) => t._id);
  const docs = TEAM_NAMES.map((name) => ({
    name,
    captainName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
    viceCaptainName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
    phone: `03${randInt(0, 9)}${randInt(1000000, 9999999)}`,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
  }));
  const teams = await Team.insertMany(docs);
  console.log(`Seeded ${teams.length} teams.`);
  return teams.map((t) => t._id);
}

async function seedStaff() {
  if (await Staff.countDocuments() > 0) return;
  const roles = ["Manager", "Receptionist", "Ground Staff", "Cleaner", "Security"];
  const docs = roles.map((role, i) => ({
    name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
    phone: `03${randInt(0, 9)}${randInt(1000000, 9999999)}`,
    role,
    salary: randInt(25000, 80000),
    joiningDate: dateOffset(-randInt(30, 400)),
    workingShift: i % 2 === 0 ? "Morning" : "Evening",
    status: "active",
  }));
  await Staff.insertMany(docs);
  console.log(`Seeded ${docs.length} staff members.`);
}

async function seedBookingsAndPayments(groundIds, customerIds, teamIds) {
  if (await Booking.countDocuments() > 0) return console.log("Bookings already exist, skipping bookings & payments.");

  const statuses = ["Confirmed", "Confirmed", "Completed", "Completed", "Pending", "Cancelled"];
  const bookings = [];
  for (let i = 0; i < 30; i++) {
    const startHour = randInt(8, 21);
    const startTime = `${pad(startHour)}:00`;
    const endTime = `${pad(startHour + 1)}:00`;
    const subtotal = randInt(2000, 4000);
    const discount = Math.random() < 0.2 ? randInt(100, 500) : 0;
    const total = subtotal - discount;
    const advancePayment = Math.random() < 0.6 ? total : Math.random() < 0.5 ? Math.round(total / 2) : 0;
    const remainingPayment = total - advancePayment;
    const customerIdx = randInt(0, customerIds.length - 1);

    bookings.push({
      ground: rand(groundIds),
      customer: customerIds[customerIdx],
      customerName: `Customer ${customerIdx + 1}`,
      phone: `03${randInt(0, 9)}${randInt(1000000, 9999999)}`,
      team: Math.random() < 0.4 ? undefined : undefined,
      date: dateOffset(randInt(-20, 15)),
      startTime,
      endTime,
      durationMinutes: 60,
      subtotal,
      discount,
      total,
      advancePayment,
      remainingPayment,
      paymentStatus: remainingPayment === 0 ? "Paid" : advancePayment > 0 ? "Partial" : "Pending",
      status: rand(statuses),
    });
  }
  const created = await Booking.insertMany(bookings);
  console.log(`Seeded ${created.length} bookings.`);

  if (await Payment.countDocuments() > 0) return console.log("Payments already exist, skipping.");
  const withAdvance = created.filter((b) => b.advancePayment > 0).slice(0, 20);
  const payments = withAdvance.map((b) => ({
    booking: b._id,
    customer: b.customer,
    amount: b.advancePayment,
    method: rand(METHODS),
    status: "Paid",
    paymentDate: b.date,
  }));
  await Payment.insertMany(payments);
  console.log(`Seeded ${payments.length} payments.`);
}

async function seedExpenses() {
  if (await Expense.countDocuments() > 0) return console.log("Expenses already exist, skipping.");
  const docs = Array.from({ length: 10 }).map(() => ({
    title: `${rand(CATEGORIES)} expense`,
    category: rand(CATEGORIES),
    amount: randInt(2000, 60000),
    date: dateOffset(-randInt(0, 45)),
    description: "Seeded demo expense.",
  }));
  await Expense.insertMany(docs);
  console.log(`Seeded ${docs.length} expenses.`);
}

async function seedTournaments(teamIds) {
  if (await Tournament.countDocuments() > 0) return console.log("Tournaments already exist, skipping.");
  await Tournament.insertMany([
    {
      name: "Backyard Premier Cup",
      startDate: dateOffset(10),
      endDate: dateOffset(24),
      numberOfTeams: 8,
      entryFee: 5000,
      prizeMoney: 100000,
      format: "League",
      status: "Registration Open",
      registeredTeams: teamIds.slice(0, 5),
    },
    {
      name: "Gujranwala Knockout Trophy",
      startDate: dateOffset(30),
      endDate: dateOffset(37),
      numberOfTeams: 8,
      entryFee: 3000,
      prizeMoney: 60000,
      format: "Knockout",
      status: "Upcoming",
      registeredTeams: teamIds.slice(5, 8),
    },
  ]);
  console.log("Seeded 2 tournaments.");
}

async function seedMembershipPlans() {
  if (await MembershipPlan.countDocuments() > 0) return console.log("Membership plans already exist, skipping.");
  await MembershipPlan.insertMany([
    { packageName: "Basic Membership", durationMonths: 1, price: 8000, discountPercent: 5, bookingHoursPerMonth: 5, benefits: ["5 hours of ground time per month", "5% discount on every booking"] },
    { packageName: "Silver Membership", durationMonths: 1, price: 15000, discountPercent: 10, bookingHoursPerMonth: 10, benefits: ["10 hours of ground time per month", "10% discount on every booking"] },
    { packageName: "Gold Membership", durationMonths: 1, price: 28000, discountPercent: 15, bookingHoursPerMonth: 20, benefits: ["20 hours of ground time per month", "15% discount on every booking", "Priority slot access"] },
  ]);
  console.log("Seeded 3 membership plans.");
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected. Seeding…\n");

  await seedAdmin();
  const groundIds = await seedGrounds();
  const customerIds = await seedCustomers();
  const teamIds = await seedTeams();
  await seedStaff();
  await seedBookingsAndPayments(groundIds, customerIds, teamIds);
  await seedExpenses();
  await seedTournaments(teamIds);
  await seedMembershipPlans();

  console.log("\nDone.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
