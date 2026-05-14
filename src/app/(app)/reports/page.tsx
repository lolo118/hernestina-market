import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { requireSuperuser } from "@/lib/auth"
import { formatARS } from "@/lib/money"
import { paymentMethodLabel } from "@/lib/constants"
import { parseDateRange, formatDateInput } from "@/lib/date-range"
import { ReportsExportButton } from "@/components/reports/export-button"

export const dynamic = "force-dynamic"

type SearchParams = Promise<{ from?: string; to?: string; preset?: string }>

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperuser()
  const sp = await searchParams
  const { from, to, fromISO, toISO } = parseDateRange(sp)
  const supabase = await createClient()

  const [{ data: sales }, { data: items }, { data: payments }, { data: dailyAll }, { data: profiles }, { data: sections }] = await Promise.all([
    supabase
      .from("sales")
      .select("id,total,iva_total,subtotal,cashier_id,created_at,status")
      .eq("status", "completed")
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabase
      .from("sale_items")
      .select("product_id,product_name,quantity,subtotal,sales!inner(created_at,status,cash_session_id)")
      .eq("sales.status", "completed")
      .gte("sales.created_at", fromISO)
      .lte("sales.created_at", toISO),
    supabase
      .from("sale_payments")
      .select("method,amount,sales!inner(created_at,status)")
      .eq("sales.status", "completed")
      .gte("sales.created_at", fromISO)
      .lte("sales.created_at", toISO),
    supabase
      .from("sales")
      .select("total,created_at")
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .order("created_at"),
    supabase.from("profiles").select("id,full_name"),
    supabase.from("sections").select("id,name,code"),
  ])

  const completedSales = sales ?? []
  const totalAmount = completedSales.reduce((acc, s) => acc + Number(s.total), 0)
  const totalIVA = completedSales.reduce((acc, s) => acc + Number(s.iva_total), 0)
  const avgTicket = completedSales.length ? totalAmount / completedSales.length : 0

  // Section breakdown — derived from sale_items.product_id → sections via products
  const productIds = Array.from(new Set((items ?? []).map((it) => it.product_id)))
  const { data: prodSections } =
    productIds.length > 0
      ? await supabase.from("products").select("id,section_id").in("id", productIds)
      : { data: [] }
  const productToSection = new Map<number, number>()
  for (const p of prodSections ?? []) productToSection.set(p.id, p.section_id)
  const sectionTotals = new Map<number, number>()
  for (const it of items ?? []) {
    const sid = productToSection.get(it.product_id)
    if (!sid) continue
    sectionTotals.set(sid, (sectionTotals.get(sid) ?? 0) + Number(it.subtotal))
  }
  const sectionLabel = (id: number) => sections?.find((s) => s.id === id)?.name ?? `Sección ${id}`

  // Payment method breakdown
  const methodTotals = new Map<string, number>()
  for (const p of payments ?? []) {
    methodTotals.set(p.method, (methodTotals.get(p.method) ?? 0) + Number(p.amount))
  }

  // Top products
  const productTotals = new Map<number, { name: string; qty: number; amount: number }>()
  for (const it of items ?? []) {
    const cur = productTotals.get(it.product_id) ?? { name: it.product_name, qty: 0, amount: 0 }
    cur.qty += Number(it.quantity)
    cur.amount += Number(it.subtotal)
    productTotals.set(it.product_id, cur)
  }
  const topProducts = Array.from(productTotals.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Per-cashier totals
  const cashierTotals = new Map<string, number>()
  for (const s of completedSales) {
    cashierTotals.set(s.cashier_id, (cashierTotals.get(s.cashier_id) ?? 0) + Number(s.total))
  }
  const cashierRows = Array.from(cashierTotals.entries())
    .map(([id, total]) => ({ id, total, name: profiles?.find((p) => p.id === id)?.full_name ?? "—" }))
    .sort((a, b) => b.total - a.total)

  // Daily chart (last 30 days)
  const dailyMap = new Map<string, number>()
  for (const s of dailyAll ?? []) {
    const day = format(new Date(s.created_at), "yyyy-MM-dd")
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(s.total))
  }
  const days: Array<{ day: string; total: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const k = format(d, "yyyy-MM-dd")
    days.push({ day: k, total: dailyMap.get(k) ?? 0 })
  }
  const maxDay = Math.max(...days.map((d) => d.total), 1)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Período: {format(from, "dd/MM/yyyy")} a {format(to, "dd/MM/yyyy")}
          </p>
        </div>
        <ReportsExportButton fromISO={fromISO} toISO={toISO} />
      </div>

      <Card>
        <CardContent className="pt-4">
          <form className="grid gap-2 md:grid-cols-5 items-end" action="/reports">
            <div className="space-y-1">
              <label className="text-xs">Desde</label>
              <Input type="date" name="from" defaultValue={formatDateInput(from)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs">Hasta</label>
              <Input type="date" name="to" defaultValue={formatDateInput(to)} />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-1 items-center text-xs">
              <a className="px-2 py-1 rounded bg-muted hover:bg-muted/70" href="/reports?preset=today">Hoy</a>
              <a className="px-2 py-1 rounded bg-muted hover:bg-muted/70" href="/reports?preset=7d">7d</a>
              <a className="px-2 py-1 rounded bg-muted hover:bg-muted/70" href="/reports?preset=30d">30d</a>
              <a className="px-2 py-1 rounded bg-muted hover:bg-muted/70" href="/reports?preset=month">Mes</a>
            </div>
            <Button type="submit">Aplicar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardDescription>Ventas totales</CardDescription><CardTitle className="text-2xl">{formatARS(totalAmount)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Cantidad de ventas</CardDescription><CardTitle className="text-2xl">{completedSales.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Ticket promedio</CardDescription><CardTitle className="text-2xl">{formatARS(avgTicket)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>IVA recaudado</CardDescription><CardTitle className="text-2xl">{formatARS(totalIVA)}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader><CardTitle>Ventas por sección</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sectionTotals.size === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : null}
            {Array.from(sectionTotals.entries()).map(([sid, amt]) => {
              const pct = totalAmount ? (amt / totalAmount) * 100 : 0
              return (
                <div key={sid} className="space-y-1">
                  <div className="flex justify-between text-sm"><span>{sectionLabel(sid)}</span><span>{formatARS(amt)} · {pct.toFixed(1)}%</span></div>
                  <div className="h-2 bg-muted rounded">
                    <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Métodos de pago</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {methodTotals.size === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : null}
            {Array.from(methodTotals.entries()).map(([m, amt]) => {
              const pct = totalAmount ? (amt / totalAmount) * 100 : 0
              return (
                <div key={m} className="space-y-1">
                  <div className="flex justify-between text-sm"><span>{paymentMethodLabel(m)}</span><span>{formatARS(amt)} · {pct.toFixed(1)}%</span></div>
                  <div className="h-2 bg-muted rounded">
                    <div className="h-2 bg-emerald-600 rounded" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top productos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin datos.</TableCell></TableRow>
              ) : null}
              {topProducts.map((p) => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">{p.qty.toLocaleString("es-AR", { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell className="text-right">{formatARS(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Por cajero</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cajero</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashierRows.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Sin datos.</TableCell></TableRow>
              ) : null}
              {cashierRows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-right">{formatARS(c.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimos 30 días</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {days.map((d) => {
              const h = Math.round((d.total / maxDay) * 100)
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center group">
                  <div
                    className="w-full bg-primary/70 hover:bg-primary rounded-sm"
                    style={{ height: `${h}%` }}
                    title={`${d.day}: ${formatARS(d.total)}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{days[0]?.day}</span>
            <span>{days[days.length - 1]?.day}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
