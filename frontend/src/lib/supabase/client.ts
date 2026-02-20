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
        lock: async <R,>(
          _name: string,
          _acquireTimeout: number,
          fn: () => Promise<R>,
        ): Promise<R> => {
          return await fn();
        },
      },
    },
  );
  return client;
}
