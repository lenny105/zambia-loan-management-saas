import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});
const lencoSchema = z.object({
  LENCO_API_URL: z.url().default("https://api.lenco.co/access/v2"),
  LENCO_API_TOKEN: z.string().min(1),
  LENCO_ENABLED_OPERATORS: z.string().default(""),
});

export function getPublicEnv() { return publicSchema.parse(process.env); }
export function getLencoEnv() { return lencoSchema.parse(process.env); }
