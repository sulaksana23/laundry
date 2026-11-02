# Pola Controller–Service–Repository

Pola ini menjadi standar backend per modul. Jangan menyalin business logic ke Route Handler atau komponen.

## Struktur fitur backend

```text
src/server/modules/orders/
├── orders.controller.ts       # HTTP, authz, schema request, response mapping
├── orders.service.ts          # use-case, aturan bisnis, transaksi aplikasi
├── orders.repository.ts       # interface/kontrak penyimpanan
├── orders.pg-repository.ts    # adapter PostgreSQL/ORM
├── orders.schemas.ts          # validasi request/response
└── orders.errors.ts           # error domain yang dapat dipetakan
```

## Kontrak repository

```ts
export interface OrderRepository {
  findById(id: string, branchId: string): Promise<Order | null>;
  findMany(query: OrderQuery): Promise<{ items: Order[]; total: number }>;
  create(input: NewOrderRecord): Promise<Order>;
  updateStatus(input: UpdateOrderStatusRecord): Promise<Order>;
}
```

Repository menyaring berdasarkan `branchId`/tenant di query. Jangan mengambil semua data lalu menyaringnya di browser atau service.

## Service/use-case

```ts
export class CreateOrderService {
  constructor(private readonly orders: OrderRepository) {}

  async execute(input: CreateOrderInput, actor: Actor): Promise<Order> {
    assertCanCreateOrders(actor, input.branchId);
    const service = await this.ordersCatalog.findActive(input.serviceId, input.branchId);
    if (!service) throw new ServiceUnavailableError();

    const amount = calculateOrderAmount(input, service.pricePolicy);
    return this.orders.create({ ...input, amount, createdBy: actor.userId });
  }
}
```

Contoh ini sengaja menyisakan `calculateOrderAmount` dan hak akses sebagai kontrak domain. Jangan mengasumsikan aturan pembulatan, minimum berat, diskon, pajak, atau biaya tambahan sebelum pemilik usaha menyetujuinya.

## Controller dan Route Handler

```ts
export async function POST(request: Request) {
  const actor = await requireActor();
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const order = await createOrderService.execute(parsed.data, actor);
  return Response.json({ data: order }, { status: 201 });
}
```

Route Handler cukup menghubungkan request ke controller. Controller menggunakan helper respons, menangani status HTTP, dan meneruskan use-case ke service.

## Aturan implementasi

- Injeksi dependency secara eksplisit agar service mudah diuji.
- Validasi request di boundary, lalu validasi invariant bisnis di domain/service.
- Database transaction dimulai pada use-case yang perlu konsistensi lintas tabel.
- Repository mengembalikan entity/record terdefinisi, bukan query builder atau object ORM ke UI.
- Gunakan error terklasifikasi (`NotFound`, `Conflict`, `Validation`, `Forbidden`) dan satu mapper HTTP.
- Setiap write harus mencatat actor, cabang, waktu, serta perubahan penting untuk audit.
- Untuk fitur baru, tambahkan unit test service/domain dan integration test repository/API.
