import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { POSClient } from "@/components/pos/pos-client"

export const dynamic = "force-dynamic"

export default async function POSPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [{ data: openSession }, { data: products }, { data: sections }, { data: settings }] = await Promise.all([
    supabase
      .from("cash_sessions")
      .select("id,opening_cash")
      .eq("cashier_id", profile.id)
      .eq("status", "open")
      .maybeSingle(),
    supabase
      .from("products")
      .select("id,name,barcode,unit,price,iva_rate,stock,section_id")
      .eq("active", true)
      .order("name")
      .limit(1500),
    supabase.from("sections").select("*").order("id"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ])

  if (!openSession) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Caja</h1>
        <Alert>
          <Wallet className="size-4" />
          <AlertTitle>No hay caja abierta</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Para vender necesitás abrir la caja con el efectivo inicial del turno.</span>
            <Button asChild>
              <Link href="/cash-sessions">Abrir caja</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <POSClient
      cashierId={profile.id}
      cashierName={profile.full_name}
      sessionId={openSession.id}
      products={(products ?? []) as never}
      sections={sections ?? []}
      storeSettings={settings ?? null}
    />
  )
}
