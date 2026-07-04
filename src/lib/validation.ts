import { z } from "zod";

export const CountrySchema = z.enum(["AU", "DE", "US", "CA"]);

export const RunPipelineSchema = z.object({
  countries: z.array(CountrySchema).min(1).max(4).optional(),
  label: z.string().trim().max(120).optional(),
});

export const SuppressionAddSchema = z.object({
  email: z.string().trim().email().max(254),
  reason: z.string().trim().max(200).optional(),
});
