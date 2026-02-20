"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Bypass Navigator.locks API which times out in some embedded browsers
        lock: async (
          _name: string,
          _acquireTimeout: number,
          fn: () => Promise<unknown>,
        ) => {
          return await fn();
        },
      },
    },
  );
  return client;
}
