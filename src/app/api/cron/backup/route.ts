import { del, list, put } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { isProActive } from "@/server/modules/license/license";
import { buildBranchBackup } from "@/server/modules/backup/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RETENTION_DAYS = 30;

function branchLocalDate(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function pruneBranchBackups(branchId: string, today: string) {
  const prefix = `laundryos/automatic/${encodeURIComponent(branchId)}/`;
  const cutoff = new Date(`${today}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - (RETENTION_DAYS - 1));
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  let cursor: string | undefined;
  let hasMore = true;
  const expired: string[] = [];
  while (hasMore) {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const match = /\/(\d{4}-\d{2}-\d{2})\.json$/.exec(blob.pathname);
      if (match && match[1] < cutoffDate) expired.push(blob.url);
    }
    hasMore = page.hasMore;
    cursor = page.cursor;
  }
  if (expired.length) await del(expired);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Jadwal backup belum dikonfigurasi." }, { status: 503 });
  }
  if (!isAuthorized(request)) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Database belum tersedia." }, { status: 503 });
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Penyimpanan backup belum terhubung." }, { status: 503 });
  }

  const result = await getNeonSql().query("SELECT id, timezone FROM laundry_branches ORDER BY id");
  const branches = Array.isArray(result) ? result as Array<{ id: string; timezone: string }> : [];
  const runAt = new Date();
  let backedUp = 0;
  let skipped = 0;
  let failed = 0;
  for (const branch of branches) {
    try {
      if (!(await isProActive(branch.id))) {
        skipped += 1;
        continue;
      }
      const backup = await buildBranchBackup(branch.id);
      const branchDate = branchLocalDate(runAt, branch.timezone);
      const pathname = `laundryos/automatic/${encodeURIComponent(branch.id)}/${branchDate}.json`;
      await put(pathname, JSON.stringify(backup), {
        access: "private",
        contentType: "application/json; charset=utf-8",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
      });
      await pruneBranchBackups(branch.id, branchDate);
      backedUp += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json(
    { success: failed === 0, processedAt: runAt.toISOString(), backedUp, skipped, failed },
    { status: failed === 0 ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
