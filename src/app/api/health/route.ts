import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-info";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "LaundryOS",
    version: APP_VERSION,
    database: isOrdersDatabaseEnabled() ? "enabled" : "demo",
    timestamp: new Date().toISOString(),
  });
}
