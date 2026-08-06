import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getPublicEnv } from "@/lib/env";

const secretSchema = z.string().min(20);
export function createAdminClient() {
  const env = getPublicEnv();
  const serviceKey = secretSchema.parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
