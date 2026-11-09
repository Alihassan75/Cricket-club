import Payment from "@/models/Payment";
import Expense from "@/models/Expense";
import CustomerMembership from "@/models/CustomerMembership";
import Tournament from "@/models/Tournament";
import MembershipPlan from "@/models/MembershipPlan";

export interface RevenueExpenseSummary {
  bookingRevenue: number;
  membershipRevenue: number;
  tournamentRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

/**
 * Revenue = paid bookings + membership income + tournament income (per spec).
 * `from`/`to` are inclusive YYYY-MM-DD bounds.
 */
export async function getRevenueExpenseSummary(from: string, to: string): Promise<RevenueExpenseSummary> {
  const paymentAgg = await Payment.aggregate([
    { $match: { paymentDate: { $gte: from, $lte: to }, status: { $ne: "Refunded" } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const bookingRevenue = paymentAgg[0]?.total || 0;

  const memberships = await CustomerMembership.find({ startDate: { $gte: from, $lte: to } }).populate("plan", "price");
  const membershipRevenue = memberships.reduce((sum, m) => sum + ((m.plan as any)?.price || 0), 0);

  const tournaments = await Tournament.find({ startDate: { $gte: from, $lte: to } });
  const tournamentRevenue = tournaments.reduce((sum, t) => sum + t.entryFee * t.registeredTeams.length, 0);

  const expenseAgg = await Expense.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalExpenses = expenseAgg[0]?.total || 0;

  const totalRevenue = bookingRevenue + membershipRevenue + tournamentRevenue;

  return {
    bookingRevenue,
    membershipRevenue,
    tournamentRevenue,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  };
}

/** Ensures the three example plans from the spec exist so the memberships page isn't empty on first run. */
export async function ensureDefaultMembershipPlans() {
  const count = await MembershipPlan.countDocuments();
  if (count > 0) return;

  await MembershipPlan.insertMany([
    {
      packageName: "Basic Membership",
      durationMonths: 1,
      price: 8000,
      discountPercent: 5,
      bookingHoursPerMonth: 5,
      benefits: ["5 hours of ground time per month", "5% discount on every booking"],
    },
    {
      packageName: "Silver Membership",
      durationMonths: 1,
      price: 15000,
      discountPercent: 10,
      bookingHoursPerMonth: 10,
      benefits: ["10 hours of ground time per month", "10% discount on every booking"],
    },
    {
      packageName: "Gold Membership",
      durationMonths: 1,
      price: 28000,
      discountPercent: 15,
      bookingHoursPerMonth: 20,
      benefits: ["20 hours of ground time per month", "15% discount on every booking", "Priority slot access"],
    },
  ]);
}
