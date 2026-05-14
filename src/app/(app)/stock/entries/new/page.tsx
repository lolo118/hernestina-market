import { StockEntryForm } from "@/components/forms/stock-entry-form"
import { createClient } from "@/lib/supabase/server"
import { requireSuperuser } from "@/lib/auth"

export default async function NewStockEntryPage() {
  await requireSuperuser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name")
    .limit(1000)
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-semibold">Nuevo movimiento de stock</h1>
      <p className="text-sm text-muted-foreground">
        Registrá ingresos de mercadería, ajustes o pérdidas. Los movimientos quedan auditados.
      </p>
      <StockEntryForm products={data ?? []} />
    </div>
  )
}
