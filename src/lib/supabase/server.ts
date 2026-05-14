import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/database.types"
import {
  supabasePublishableKey,
  supabaseSecretKey,
  supabaseUrl,
} from "@/lib/supabase/env"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Component invocations cannot set cookies; the proxy refreshes them.
        }
      },
    },
  })
}

export function createAdminClient() {
  // Service-role / secret client. SERVER ONLY. Never import in a client component.
  const { createClient: createAdmin } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js")
  return createAdmin<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
