"use client";
import { useEffect, useState } from "react";

type Payment = {
  _id: string;
  booking: { _id: string; customerName: string; date: string; startTime: string; endTime: string; total: number } | null;
  customer: { fullName: string; phone: string } | null;
  amount: number;
  method: string;
  status: string;
  paymentDate: string;
};

type Booking = {
  _id: string;
  customerName: string;
  date: string;
  startTime: string;
  endTime: string;
  total: number;
  remainingPayment: number;
  paymentStatus: string;
};

const METHODS = ["Cash", "Bank Transfer", "Card", "JazzCash", "EasyPaisa"];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingResults, setBookingResults] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const data = await res.json().catch(() => ({}));
    setPayments(data.payments || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const searchBookings = async () => {
    const res = await fetch(`/api/bookings?customer=${encodeURIComponent(bookingSearch)}`);
    const data = await res.json().catch(() => ({}));
    setBookingResults((data.bookings || []).filter((b: Booking) => b.remainingPayment > 0));
  };

  const record = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: selectedBooking._id,
        amount: Number(amount),
        method,
        paymentDate,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not record payment.");
      return;
    }
    setShowForm(false);
    setSelectedBooking(null);
    setAmount("");
    setBookingResults([]);
    setBookingSearch("");
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Payments</h1>
          <p className="text-sm text-gray-500">Record payments against bookings and print receipts.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Record payment
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading payments…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-line">
                <th className="font-medium px-4 py-3">Date</th>
                <th className="font-medium px-4 py-3">Customer</th>
                <th className="font-medium px-4 py-3">Booking</th>
                <th className="font-medium px-4 py-3">Amount</th>
                <th className="font-medium px-4 py-3">Method</th>
                <th className="font-medium px-4 py-3">Status</th>
                <th className="font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">{p.paymentDate}</td>
                  <td className="px-4 py-3">{p.customer?.fullName || p.booking?.customerName || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.booking ? `${p.booking.date} · ${p.booking.startTime}-${p.booking.endTime}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold">Rs {p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">{p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === "Refunded" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setReceipt(p)} className="text-xs font-semibold text-green">
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Record a payment</h2>
            {!selectedBooking ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    placeholder="Search customer name or phone"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchBookings()}
                    className="flex-1 rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
                  />
                  <button onClick={searchBookings} className="px-3 py-2 text-sm font-semibold text-white bg-navy rounded-lg">
                    Find
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {bookingResults.map((b) => (
                    <button
                      key={b._id}
                      onClick={() => {
                        setSelectedBooking(b);
                        setAmount(String(b.remainingPayment));
                      }}
                      className="text-left rounded-lg border border-line p-2.5 hover:border-green"
                    >
                      <div className="text-sm font-semibold">{b.customerName}</div>
                      <div className="text-xs text-gray-500">
                        {b.date} · {b.startTime}-{b.endTime} · Owes Rs {b.remainingPayment.toLocaleString()}
                      </div>
                    </button>
                  ))}
                  {bookingResults.length === 0 && bookingSearch && (
                    <p className="text-xs text-gray-500">No bookings with a balance found for that search.</p>
                  )}
                </div>
                <button onClick={() => setShowForm(false)} className="text-sm font-semibold text-gray-500 mt-2">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="font-semibold">{selectedBooking.customerName}</div>
                  <div className="text-xs text-gray-500">
                    {selectedBooking.date} · Owes Rs {selectedBooking.remainingPayment.toLocaleString()} of Rs {selectedBooking.total.toLocaleString()}
                  </div>
                </div>
                <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                  {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2 justify-end mt-2">
                  <button onClick={() => setSelectedBooking(null)} className="px-4 py-2 text-sm font-semibold text-gray-500">Back</button>
                  <button onClick={record} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                    {saving ? "Saving…" : "Record payment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 print:bg-white">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" id="receipt-print">
            <div className="text-center mb-4">
              <div className="font-bold text-navy">Backyard Cricket Club</div>
              <div className="text-xs text-gray-500">Payment Receipt</div>
            </div>
            <div className="text-sm flex flex-col gap-1.5 border-t border-b border-dashed border-gray-300 py-3 mb-4">
              <div className="flex justify-between"><span className="text-gray-500">Receipt ID</span><span>{receipt._id.slice(-8).toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{receipt.paymentDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{receipt.customer?.fullName || receipt.booking?.customerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Method</span><span>{receipt.method}</span></div>
              <div className="flex justify-between font-bold text-base pt-2"><span>Amount paid</span><span>Rs {receipt.amount.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-2 print:hidden">
              <button onClick={() => setReceipt(null)} className="flex-1 px-4 py-2 text-sm font-semibold text-gray-500">Close</button>
              <button onClick={() => window.print()} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg">Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
