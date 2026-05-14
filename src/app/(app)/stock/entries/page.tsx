import Link from "next/link"
import { format } from "date-fns"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { formatQuantity } from "@/lib/money"
import { unitAbbrev } from "@/lib/constants"

export const dynamic = "force-dynamic"

const TYPE_VARIANTS: Record<string, { label: string; cls: string }> = {
  entry: { label: "Ingreso", cls: "bg-emerald-100 text-emerald-800" },
  adjustment: { label: "Ajuste", cls: "bg-amber-100 text-amber-800" },
  sale: { label: "Venta", cls: "bg-slate-100 text-slate-700" },
  void: { label: "Anulación", cls: "bg-blue-100 text-blue-800" },
  loss: { label: "Pérdida", cls: "bg-red-100 text-red-800" },
}

export default async function StockEntriesPage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { data } = await supabase
    .from("stock_movements")
    .select("*, products(name,unit)")
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Historial de stock</h1>
          <p className="text-sm text-muted-foreground">Últimos movimientos.</p>
        </div>
        {profile.role === "superuser" ? (
          <Button asChild>
            <Link href="/stock/entries/new">
              <Plus className="size-4" /> Nuevo movimiento
            </Link>
          </Button>
        ) : null}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Sin movimientos.
                </TableCell>
              </TableRow>
            ) : null}
            {data?.map((m) => {
              const prod = (m as unknown as { products?: { name: string; unit: string } }).products
              const t = TYPE_VARIANTS[m.type] ?? { label: m.type, cls: "" }
              return (
                <TableRow key={m.id}>
                  <TableCell>{format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{prod?.name ?? `#${m.product_id}`}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${t.cls}`}>{t.label}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(m.quantity) >= 0 ? "+" : ""}
                    {formatQuantity(m.quantity, prod?.unit ?? "un")} {unitAbbrev(prod?.unit ?? "un")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.reason ?? "—"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
