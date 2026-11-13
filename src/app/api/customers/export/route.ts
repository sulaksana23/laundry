import { NextResponse } from "next/server";
import { csvCell } from "@/lib/csv";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getCustomersService } from "@/server/modules/customers/customers.runtime";
import type { CustomerSummary } from "@/server/modules/customers/customers.repository";
import { hasPermission } from "@/server/modules/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function csvRows(rows: CustomerSummary[]) {
  return rows.map((row) => [row.name, row.phone, row.orders, row.totalSpent, row.lastOrder]
    .map(csvCell).join(",") + "\r\n").join("");
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "customers:export")) return NextResponse.json({ error: "Ekspor data pelanggan hanya tersedia bagi pemilik." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Ekspor pelanggan belum aktif pada mode demo." }, { status: 503 });

  const search = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const pages = getCustomersService().exportPages(session.branchId, search);
  try {
    const first = await pages.next();
    const encoder = new TextEncoder();
    const header = "\uFEFFnama,no_hp,jumlah_pesanan,total_transaksi_rp,pesanan_terakhir\r\n";
    let firstPage: CustomerSummary[] | undefined = first.done ? undefined : first.value;
    let headerPending = true;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          if (headerPending) {
            controller.enqueue(encoder.encode(header + (firstPage ? csvRows(firstPage) : "")));
            headerPending = false;
            firstPage = undefined;
            if (first.done) controller.close();
            return;
          }
          const next = await pages.next();
          if (next.done) {
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(csvRows(next.value)));
        } catch (error) {
          controller.error(error);
          await pages.return(undefined);
        }
      },
      async cancel() {
        await pages.return(undefined);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="pelanggan-laundry.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    await pages.return(undefined);
    return NextResponse.json({ error: "Data pelanggan gagal diekspor. Coba lagi sebentar." }, { status: 500 });
  }
}
