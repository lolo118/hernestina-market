/**
 * Centralizes env access so we can accept both the new publishable-key naming
 * and the legacy anon-key naming Supabase used before the migration.
 */
export function supabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  return v
}

export function supabasePublishableKey(): string {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!v) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    )
  }
  return v
}

export function supabaseSecretKey(): string {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!v) {
    throw new Error(
      "Server-only key missing. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).",
    )
  }
  return v
}
