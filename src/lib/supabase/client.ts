"use client";

import { createBrowserClient } from "@supabase/ssr";
import { z } from "zod";

const browserEnv = z.object({ url: z.string().url(), key: z.string().min(1) });
export function createClient() {
  const env = browserEnv.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return createBrowserClient(env.url, env.key);
}
