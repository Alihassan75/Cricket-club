/**
 * Seeds the database with demo data matching the spec's "Seed Data" section:
 * 1 indoor ground (4 fixed slots), 20 customers, 10 teams, 30 bookings, 5 staff, 20 payments,
 * 10 expenses, 2 tournaments, 3 membership plans.
 *
 * Also creates one login you can use immediately (see the printed summary),
 * a handful of matches so the points table isn't empty, and a couple of
 * membership assignments — small additions beyond the exact spec counts,
 * purely so the seeded app has something to look at everywhere.
 *
 * Run with: npm run seed
 * Safe to re-run: it only clears the business-data collections listed below
 * (never the User collection), so your own login accounts are untouched.
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User";
import Ground from "../models/Ground";
import Staff from "../models/Staff";
import Customer from "../models/Customer";
import Team from "../models/Team";
import Player from "../models/Player";
import Booking, { ACTIVE_BOOKING_STATUSES } from "../models/Booking";
import Payment from "../models/Payment";
import Expense from "../models/Expense";
import MembershipPlan from "../models/MembershipPlan";
import CustomerMembership from "../models/CustomerMembership";
import Tournament from "../models/Tournament";
import Match from "../models/Match";

import { calculateBookingPrice } from "../lib/pricing";
import { rangesOverlap } from "../lib/time";
import { recalculateCustomerStats } from "../lib/customers";

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const FIRST_NAMES = [
  "Ahmed", "Bilal", "Usman", "Hamza", "Ali", "Zain", "Hassan", "Fahad", "Imran", "Kashif",
  "Sara", "Ayesha", "Zainab", "Mahnoor", "Hira", "Rabia", "Nida", "Sana", "Mehwish", "Iqra",
];
const LAST_NAMES = ["Khan", "Ahmed", "Malik", "Butt", "Chaudhry", "Sheikh", "Raza", "Iqbal", "Rehman", "Qureshi"];
const TEAM_NAMES = [
  "Gujranwala Gladiators", "Shaheen Warriors", "Lahore Lions", "Punjab Panthers", "Iron Strikers",
  "Falcon XI", "Royal Challengers Gujranwala", "City Titans", "Al-Noor Academy", "United Cricketers",
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set — copy .env.example to .env.local first.");

  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri);

  console.log("Clearing existing business data (Users are never touched)…");
  await Promise.all([
    Ground.deleteMany({}),
    Staff.deleteMany({}),
    Customer.deleteMany({}),
    Team.deleteMany({}),
    Player.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    Expense.deleteMany({}),
    MembershipPlan.deleteMany({}),
    CustomerMembership.deleteMany({}),
    Tournament.deleteMany({}),
    Match.deleteMany({}),
  ]);

  // --- Demo login ------------------------------------------------------
  const adminEmail = "admin@duckwortharena.pk";
  const adminPassword = "Admin@12345";
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: "Bilal Ahmed",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "arena_manager",
      isEmailVerified: true,
    });
    console.log(`Created demo login: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Demo login already exists: ${adminEmail}`);
  }

  // --- Grounds (1: Indoor Cricket, 4 fixed slots) -----------------------
  const grounds = await Ground.insertMany([
    {
      name: "Indoor Cricket", groundNumber: "IC1", surface: "indoor",
      size: "70x30m", capacity: 40, location: "Main hall",
      facilities: ["Flood lights", "Nets", "Air conditioning", "Scoreboard", "Seating area"],
      pricePerHour: 1500, openingTime: "14:00", closingTime: "22:00", status: "active",
      customSlots: [
        { label: "Slot 1", start: "14:00", end: "16:00", price: 3000 },
        { label: "Slot 2", start: "16:00", end: "18:00", price: 3000 },
        { label: "Slot 3", start: "18:00", end: "20:00", price: 3000 },
        { label: "Slot 4", start: "20:00", end: "22:00", price: 5000 },
      ],
    },
  ]);
  console.log(`Created ${grounds.length} grounds.`);

  // --- Membership plans (3) ----------------------------------------------
  const plans = await MembershipPlan.insertMany([
    { packageName: "Basic Membership", durationMonths: 1, price: 8000, discountPercent: 5, bookingHoursPerMonth: 5, benefits: ["5 hours of ground time per month", "5% discount on every booking"] },
    { packageName: "Silver Membership", durationMonths: 1, price: 15000, discountPercent: 10, bookingHoursPerMonth: 10, benefits: ["10 hours of ground time per month", "10% discount on every booking"] },
    { packageName: "Gold Membership", durationMonths: 1, price: 28000, discountPercent: 15, bookingHoursPerMonth: 20, benefits: ["20 hours of ground time per month", "15% discount on every booking", "Priority slot access"] },
  ]);
  console.log(`Created ${plans.length} membership plans.`);

  // --- Staff (5) -----------------------------------------------------------
  const staffDefs = [
    { name: "Faisal Mahmood", role: "Manager", salary: 85000, shift: "9am - 6pm" },
    { name: "Ayesha Tariq", role: "Receptionist", salary: 45000, shift: "8am - 4pm" },
    { name: "Naveed Akhtar", role: "Ground Staff", salary: 38000, shift: "6am - 2pm" },
    { name: "Rukhsana Bibi", role: "Cleaner", salary: 30000, shift: "6am - 12pm" },
    { name: "Zeeshan Haider", role: "Umpire", salary: 40000, shift: "On call" },
  ];
  const staff = await Staff.insertMany(
    staffDefs.map((s, i) => ({
      name: s.name,
      phone: `03${randInt(0, 4)}${randInt(1000000, 9999999)}`,
      role: s.role,
      salary: s.salary,
      joiningDate: dateOffset(-randInt(60, 900)),
      workingShift: s.shift,
      status: "active",
    }))
  );
  console.log(`Created ${staff.length} staff members.`);

  // --- Customers (20) -----------------------------------------------------
  const customers = [];
  const usedPhones = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    let phone: string;
    do {
      phone = `03${randInt(0, 4)}${randInt(1000000, 9999999)}`;
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    const customer = await Customer.create({
      fullName: `${first} ${last}`,
      phone,
      email: Math.random() > 0.4 ? `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com` : undefined,
      address: Math.random() > 0.5 ? `House ${randInt(1, 200)}, Model Town, Gujranwala` : undefined,
      membershipStatus: "none",
    });
    customers.push(customer);
  }
  console.log(`Created ${customers.length} customers.`);

  // --- A few memberships (bonus, not an exact spec count) -----------------
  const membershipCustomers = customers.slice(0, 3);
  for (let i = 0; i < membershipCustomers.length; i++) {
    const plan = plans[i % plans.length];
    const startDate = dateOffset(-randInt(1, 20));
    const expiry = new Date(startDate);
    expiry.setMonth(expiry.getMonth() + plan.durationMonths);
    await CustomerMembership.create({
      customer: membershipCustomers[i]._id,
      plan: plan._id,
      startDate,
      expiryDate: expiry.toISOString().slice(0, 10),
      hoursAllotted: plan.bookingHoursPerMonth,
      usedHours: randInt(0, Math.floor(plan.bookingHoursPerMonth / 2)),
      status: "active",
    });
    membershipCustomers[i].membershipStatus = "active";
    await membershipCustomers[i].save();
  }
  console.log(`Assigned ${membershipCustomers.length} active memberships.`);

  // --- Teams (10) + players (~3 each) -------------------------------------
  const teams = [];
  for (const name of TEAM_NAMES) {
    const captain = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;
    const team = await Team.create({
      name,
      captainName: captain,
      viceCaptainName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      phone: `03${randInt(0, 4)}${randInt(1000000, 9999999)}`,
    });
    teams.push(team);

    const roles = ["Batsman", "Batsman", "Bowler", "Bowler", "All-rounder", "Wicket Keeper"];
    for (let i = 0; i < 4; i++) {
      await Player.create({
        team: team._id,
        name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        age: randInt(18, 34),
        role: roles[i % roles.length],
        battingStyle: rand(["Right-hand bat", "Left-hand bat"]),
        bowlingStyle: rand(["Right-arm fast", "Left-arm spin", "Right-arm off-break", "None"]),
      });
    }
  }
  console.log(`Created ${teams.length} teams with players.`);

  // --- Bookings (30) + Payments (20) --------------------------------------
  const slotStarts = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
  const durationsHrs = [1, 1.5, 2];
  const occupied = new Map<string, { start: string; end: string }[]>(); // key: groundId|date

  function addMinutes(hhmm: string, mins: number) {
    const [h, m] = hhmm.split(":").map(Number);
    const total = h * 60 + m + mins;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  let paymentsCreated = 0;
  const methods = ["Cash", "Bank Transfer", "Card", "JazzCash", "EasyPaisa"];

  for (let i = 0; i < 30; i++) {
    const ground = rand(grounds);
    const customer = rand(customers);
    const dayOffset = randInt(-14, 14);
    const date = dateOffset(dayOffset);
    const key = `${ground._id}|${date}`;
    const existing = occupied.get(key) || [];

    let slot: { start: string; end: string } | null = null;
    for (let attempt = 0; attempt < 8 && !slot; attempt++) {
      const fixed = (ground as any).customSlots?.length ? rand((ground as any).customSlots as { start: string; end: string }[]) : null;
      const start = fixed ? fixed.start : rand(slotStarts);
      const end = fixed ? fixed.end : addMinutes(start, rand(durationsHrs) * 60);
      if (!existing.some((b) => rangesOverlap(start, end, b.start, b.end))) {
        slot = { start, end };
      }
    }
    if (!slot) continue; // couldn't find a free slot after a few tries — skip this one

    existing.push(slot);
    occupied.set(key, existing);

    const price = calculateBookingPrice(ground as any, date, slot.start, slot.end);
    const discount = Math.random() > 0.8 ? Math.round(price.subtotal * 0.05) : 0;
    const total = price.subtotal - discount;

    const isPast = dayOffset < 0;
    let status: string;
    let paymentStatus: string;
    let advancePayment = 0;

    if (isPast) {
      status = rand(["Completed", "Completed", "Completed", "Cancelled", "No Show"]);
      paymentStatus = status === "Completed" ? "Paid" : status === "Cancelled" ? "Refunded" : "Pending";
      advancePayment = paymentStatus === "Paid" ? total : 0;
    } else {
      status = rand(["Confirmed", "Confirmed", "Pending"]);
      paymentStatus = status === "Confirmed" ? rand(["Paid", "Partial"]) : "Pending";
      advancePayment = paymentStatus === "Paid" ? total : paymentStatus === "Partial" ? Math.round(total * 0.4) : 0;
    }
    const remainingPayment = Math.max(0, total - advancePayment);

    const booking = await Booking.create({
      ground: ground._id,
      customer: customer._id,
      customerName: customer.fullName,
      phone: customer.phone,
      date,
      startTime: slot.start,
      endTime: slot.end,
      durationMinutes: price.durationMinutes,
      subtotal: price.subtotal,
      discount,
      total,
      advancePayment,
      remainingPayment,
      paymentStatus,
      status,
      createdBy: admin._id,
    });

    if (advancePayment > 0 && paymentsCreated < 20) {
      await Payment.create({
        booking: booking._id,
        customer: customer._id,
        amount: advancePayment,
        method: rand(methods),
        status: paymentStatus === "Refunded" ? "Refunded" : "Paid",
        paymentDate: date,
        recordedBy: admin._id,
      });
      paymentsCreated++;
    }
  }
  console.log(`Created bookings and ${paymentsCreated} payments.`);

  for (const customer of customers) {
    await recalculateCustomerStats(customer._id.toString());
  }

  // --- Expenses (10) -------------------------------------------------------
  const expenseDefs: { title: string; category: string; amount: number }[] = [
    { title: "Monthly electricity bill", category: "Electricity", amount: 45000 },
    { title: "Ground rent", category: "Rent", amount: 120000 },
    { title: "Staff salaries", category: "Staff Salary", amount: 238000 },
    { title: "Pitch relaying materials", category: "Ground Maintenance", amount: 32000 },
    { title: "New cricket bats & balls", category: "Cricket Equipment", amount: 28000 },
    { title: "Internet & WiFi", category: "Internet", amount: 6000 },
    { title: "Facebook ads campaign", category: "Marketing", amount: 15000 },
    { title: "Deep cleaning service", category: "Cleaning", amount: 9000 },
    { title: "Floodlight repair", category: "Repairs", amount: 18000 },
    { title: "Miscellaneous supplies", category: "Other", amount: 7000 },
  ];
  await Expense.insertMany(
    expenseDefs.map((e) => ({ ...e, date: dateOffset(-randInt(1, 28)) }))
  );
  console.log(`Created ${expenseDefs.length} expenses.`);

  // --- Tournaments (2) + a few matches (bonus) ----------------------------
  const t1 = await Tournament.create({
    name: "Gujranwala Premier League",
    startDate: dateOffset(7), endDate: dateOffset(21),
    numberOfTeams: 6, entryFee: 5000, prizeMoney: 150000,
    format: "League", status: "Registration Open",
    registeredTeams: teams.slice(0, 6).map((t) => t._id),
  });
  const t2 = await Tournament.create({
    name: "Backyard Knockout Cup",
    startDate: dateOffset(-10), endDate: dateOffset(-2),
    numberOfTeams: 4, entryFee: 3000, prizeMoney: 60000,
    format: "Knockout", status: "Completed",
    registeredTeams: teams.slice(6, 10).map((t) => t._id),
  });
  console.log("Created 2 tournaments.");

  // A handful of completed matches for t2 so the points table has data.
  const t2Teams = teams.slice(6, 10);
  const matchPairs = [[0, 1], [2, 3], [0, 2]];
  for (const [a, b] of matchPairs) {
    const scoreA = { runs: randInt(90, 180), wickets: randInt(3, 10), overs: 20, balls: 0, extras: randInt(2, 10) };
    const scoreB = { runs: randInt(90, 180), wickets: randInt(3, 10), overs: 20, balls: 0, extras: randInt(2, 10) };
    const winner = scoreA.runs === scoreB.runs ? undefined : scoreA.runs > scoreB.runs ? t2Teams[a]._id : t2Teams[b]._id;
    await Match.create({
      teamA: t2Teams[a]._id, teamB: t2Teams[b]._id, ground: rand(grounds)._id, tournament: t2._id,
      date: dateOffset(-randInt(3, 9)), startTime: "16:00", overs: 20, matchType: "Tournament",
      status: "Completed", scoreA, scoreB, winner,
    });
    if (winner) {
      const loser = winner.toString() === t2Teams[a]._id.toString() ? t2Teams[b] : t2Teams[a];
      const winnerTeam = winner.toString() === t2Teams[a]._id.toString() ? t2Teams[a] : t2Teams[b];
      await Team.findByIdAndUpdate(winnerTeam._id, { $inc: { matchesPlayed: 1, matchesWon: 1 } });
      await Team.findByIdAndUpdate(loser._id, { $inc: { matchesPlayed: 1, matchesLost: 1 } });
    }
  }
  console.log(`Created ${matchPairs.length} completed matches for the points table.`);

  console.log("\n✅ Seed complete.");
  console.log(`   Log in with: ${adminEmail} / ${adminPassword}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
