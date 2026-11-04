import { NextResponse } from "next/server";
import { z } from "zod";
import { orderStatuses } from "@/features/orders/domain/order";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getOrdersService } from "@/server/modules/orders/orders.runtime";
import { hasPermission } from "@/server/modules/auth/permissions";
import { redactOrderForRole } from "@/server/modules/orders/order-access";
import {
  InvalidOrderTransitionError,
  OrderConflictError,
  OrderNotFoundError,
} from "@/server/modules/orders/orders.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusSchema = z.object({ nextStatus: z.enum(orderStatuses) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "orders:advance")) return NextResponse.json({ error: "Akses mengubah status pesanan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) {
    return NextResponse.json({ error: "PostgreSQL Pesanan hanya aktif pada local development atau Vercel Preview." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    }
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Status pesanan tidak valid." }, { status: 400 });
    }
    const order = await getOrdersService().advanceStatus({
      id,
      nextStatus: parsed.data.nextStatus,
      branchId: session.branchId,
      actorId: session.userId,
    });
    return NextResponse.json({ order: redactOrderForRole(order, session.role) });
  } catch (error) {
    if (error instanceof OrderNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof InvalidOrderTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof OrderConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof SyntaxError || error instanceof z.ZodError) return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    return NextResponse.json({ error: "Status pesanan gagal diperbarui." }, { status: 500 });
  }
}
