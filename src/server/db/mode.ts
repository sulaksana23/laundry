import "server-only";

export function isOrdersDatabaseEnabled() {
  if (!process.env.DATABASE_URL) return false;
  if (process.env.VERCEL_ENV === "production") {
    const authSecret = process.env.AUTH_SECRET;
    return Boolean(authSecret && Buffer.byteLength(authSecret) >= 32);
  }
  if (process.env.VERCEL_ENV === "preview") return true;
  return !process.env.VERCEL_ENV
    && process.env.NODE_ENV === "development"
    && process.env.LAUNDRY_DATABASE_MODE === "true";
}

export function getLaundryBranchId() {
  return process.env.LAUNDRY_BRANCH_ID || "main";
}
