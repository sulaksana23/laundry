import { get, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { hasPermission } from "@/server/modules/auth/permissions";
import { isProActive } from "@/server/modules/license/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return jsonError("Silakan masuk untuk melihat backup otomatis.", 401);
  if (session.role !== "owner" || !hasPermission(session.role, "backup:manage")) return jsonError("Akses backup otomatis hanya tersedia bagi pemilik.", 403);
  if (process.env.VERCEL_ENV !== "production") return jsonError("Backup otomatis hanya tersedia pada lingkungan produksi.", 503);
  if (!isOrdersDatabaseEnabled()) return jsonError("Database belum tersedia.", 503);
  if (!(await isProActive(session.branchId))) return jsonError("Backup otomatis tersedia untuk cabang berlisensi LaundryOS Pro.", 403);
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) return jsonError("Penyimpanan backup otomatis belum terhubung.", 503);

  const prefix = `laundryos/automatic/${encodeURIComponent(session.branchId)}/`;
  const requestedDate = new URL(request.url).searchParams.get("date");
  if (requestedDate !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return jsonError("Tanggal backup tidak valid.", 400);
    const pathname = `${prefix}${requestedDate}.json`;
    const blob = await get(pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200) return jsonError("Backup pada tanggal tersebut tidak ditemukan.", 404);
    return new NextResponse(blob.stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="laundryos-backup-${requestedDate}.json"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const { blobs } = await list({ prefix, limit: 1000 });
  const backups = blobs.flatMap((blob) => {
    const match = /\/(\d{4}-\d{2}-\d{2})\.json$/.exec(blob.pathname);
    return match ? [{ date: match[1], size: blob.size }] : [];
  }).sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ backups }, { headers: { "Cache-Control": "no-store" } });
}
