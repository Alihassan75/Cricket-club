/**
 * One-off, NON-destructive setup: makes "Indoor Cricket" the club's only bookable ground.
 *  - creates (or updates) the Indoor Cricket ground with 4 fixed slots; the 4th is the priciest
 *  - hides every other ground (status -> "disabled"); nothing is deleted, bookings stay intact
 * Run with:  npm run setup:indoor
 */
import "dotenv/config";
import mongoose from "mongoose";
import Ground from "../models/Ground";

const NAME = "Indoor Cricket";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");
  await mongoose.connect(uri);

  const hidden = await Ground.updateMany({ name: { $ne: NAME } }, { status: "disabled" });

  await Ground.findOneAndUpdate(
    { name: NAME },
    {
      name: NAME,
      groundNumber: "IC1",
      surface: "indoor",
      description: "Floodlit indoor cricket arena with four fixed sessions a day.",
      facilities: ["Flood lights", "Nets", "Air conditioning", "Scoreboard", "Seating area"],
      pricePerHour: 1500,
      openingTime: "14:00",
      closingTime: "22:00",
      status: "active",
      customSlots: [
        { label: "Slot 1", start: "14:00", end: "16:00", price: 3000 },
        { label: "Slot 2", start: "16:00", end: "18:00", price: 3000 },
        { label: "Slot 3", start: "18:00", end: "20:00", price: 3000 },
        { label: "Slot 4", start: "20:00", end: "22:00", price: 5000 },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Indoor Cricket is ready (4 slots). Hid ${hidden.modifiedCount} other ground(s).`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
