import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { orderStatuses, type OrderStatus } from "@/features/orders/domain/order";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getOrdersService } from "@/server/modules/orders/orders.runtime";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { error: "PostgreSQL Pesanan hanya aktif pada local development atau Vercel Preview." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!isOrdersDatabaseEnabled()) return unavailable();
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 100);
  const search = url.searchParams.get("search") ?? undefined;
  const statusValue = url.searchParams.get("status");
  const customerId = url.searchParams.get("customerId");
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json({ error: "Parameter halaman tidak valid." }, { status: 400 });
  }
  if (statusValue && !orderStatuses.some((value) => value === statusValue)) {
    return NextResponse.json({ error: "Filter status tidak valid." }, { status: 400 });
  }
  if (customerId !== null && !isUuid(customerId)) {
    return NextResponse.json({ error: "ID pelanggan tidak valid." }, { status: 400 });
  }

  try {
    const result = await getOrdersService().list({
      branchId: session.branchId,
      page,
      pageSize,
      search,
      customerId: customerId ?? undefined,
      status: statusValue as OrderStatus | undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Daftar pesanan gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!isOrdersDatabaseEnabled()) return unavailable();
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  try {
    const order = await getOrdersService().create(input, session.branchId, session.userId);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Data pesanan tidak valid." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Layanan tidak tersedia pada cabang ini.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Pesanan gagal disimpan." }, { status: 500 });
  }
}
