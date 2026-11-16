import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env.local");
}

// Cache the connection across hot-reloads in dev so we don't open a new
// connection on every API route invocation.
let cached = (global as any).mongooseConn;
if (!cached) {
  cached = (global as any).mongooseConn = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .then((m) => m)
      .catch((err) => {
        cached.promise = null; // don't keep a failed attempt: the next request tries again
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
