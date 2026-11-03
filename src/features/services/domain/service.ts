import { z } from "zod";

export const serviceUnits = ["kg", "pcs", "pasang"] as const;
export type ServiceUnit = (typeof serviceUnits)[number];

export interface LaundryService {
  id: string;
  name: string;
  description: string;
  unit: ServiceUnit;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

export const serviceInputSchema = z.object({
  name: z.string().trim().min(2, "Nama layanan minimal 2 karakter.").max(100),
  description: z.string().trim().max(240, "Deskripsi maksimal 240 karakter.").default(""),
  unit: z.enum(serviceUnits),
  price: z.coerce.number().int().min(0).safe(),
  durationMinutes: z.coerce.number().int().min(1).max(43200).safe(),
  isActive: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;
