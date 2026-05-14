import Link from "next/link"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { formatARS } from "@/lib/money"
import { SALE_STATUS_LABELS } from "@/lib/constants"
import { parseDateRange, formatDateInput } from "@/lib/date-range"

export const dynamic = "force-dynamic"

type SearchParams = Promise<{
  from?: string
  to?: string
  preset?: string
  status?: string
  method?: string
  cashier?: string
}>

export default async function SalesPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile()
  const sp = await searchParams
  const { from, to, fromISO, toISO } = parseDateRange(sp)
  const supabase = await createClient()

  let q = supabase
    .from("sales")
    .select("id,created_at,total,status,cashier_id,profiles:cashier_id(full_name)")
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .order("created_at", { ascending: false })
    .limit(500)

  if (sp.status) q = q.eq("status", sp.status as never)
  if (profile.role !== "superuser") q = q.eq("cashier_id", profile.id)
  else if (sp.cashier) q = q.eq("cashier_id", sp.cashier)

  const sales = await q

  // Filter by payment method (post-query — small dataset)
  let filteredSales = sales.data ?? []
  if (sp.method && filteredSales.length) {
    const ids = filteredSales.map((s) => s.id)
    const { data: pays } = await supabase
      .from("sale_payments")
      .select("sale_id,method")
      .in("sale_id", ids)
      .eq("method", sp.method as never)
    const matched = new Set(pays?.map((p) => p.sale_id))
    filteredSales = filteredSales.filter((s) => matched.has(s.id))
  }

  const totalAmount = filteredSales
    .filter((s) => s.status === "completed")
    .reduce((acc, s) => acc + Number(s.total), 0)

  const cashiers =
    profile.role === "superuser"
      ? await supabase.from("profiles").select("id,full_name").order("full_name")
      : { data: null }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            Total del período: {formatARS(totalAmount)} · {filteredSales.length} ticket(s)
          </p>
        </div>
      </div>

      <Card className="p-3">
        <form className="grid gap-2 md:grid-cols-6 items-end" action="/sales">
          <div className="space-y-1">
            <label className="text-xs">Desde</label>
            <Input type="date" name="from" defaultValue={formatDateInput(from)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs">Hasta</label>
            <Input type="date" name="to" defaultValue={formatDateInput(to)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs">Estado</label>
            <select name="status" defaultValue={sp.status ?? ""} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">Todos</option>
              <option value="completed">Completadas</option>
              <option value="voided">Anuladas</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs">Método</label>
            <select name="method" defaultValue={sp.method ?? ""} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          {profile.role === "superuser" ? (
            <div className="space-y-1">
              <label className="text-xs">Cajero</label>
              <select name="cashier" defaultValue={sp.cashier ?? ""} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="">Todos</option>
                {cashiers.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          ) : null}
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>N°</TableHead>
              {profile.role === "superuser" ? <TableHead>Cajero</TableHead> : null}
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={profile.role === "superuser" ? 6 : 5} className="text-center text-muted-foreground py-8">
                  No hay ventas en el período seleccionado.
                </TableCell>
              </TableRow>
            ) : null}
            {filteredSales.map((s) => {
              const cashier = (s as unknown as { profiles?: { full_name: string } }).profiles
              return (
                <TableRow key={s.id}>
                  <TableCell>{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>#{s.id}</TableCell>
                  {profile.role === "superuser" ? <TableCell>{cashier?.full_name ?? "—"}</TableCell> : null}
                  <TableCell className="text-right font-medium">{formatARS(s.total)}</TableCell>
                  <TableCell>
                    {s.status === "voided" ? (
                      <Badge variant="destructive">{SALE_STATUS_LABELS[s.status]}</Badge>
                    ) : (
                      <Badge variant="secondary">{SALE_STATUS_LABELS[s.status]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/sales/${s.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
