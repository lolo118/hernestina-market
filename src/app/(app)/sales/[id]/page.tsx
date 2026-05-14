import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Printer, Ban, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { formatARS, formatQuantity } from "@/lib/money"
import { paymentMethodLabel, unitAbbrev, SALE_STATUS_LABELS } from "@/lib/constants"
import { VoidSaleButton } from "@/components/sales/void-sale-button"

type Params = Promise<{ id: string }>

export default async function SaleDetailPage({ params }: { params: Params }) {
  const profile = await requireProfile()
  const { id } = await params
  const saleId = Number(id)
  if (!Number.isFinite(saleId)) notFound()
  const supabase = await createClient()
  const [{ data: sale }, { data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("sales")
      .select("*, profiles:cashier_id(full_name), voided:voided_by(full_name)")
      .eq("id", saleId)
      .maybeSingle(),
    supabase.from("sale_items").select("*").eq("sale_id", saleId).order("id"),
    supabase.from("sale_payments").select("*").eq("sale_id", saleId).order("id"),
  ])
  if (!sale) notFound()

  const cashierName = (sale as unknown as { profiles?: { full_name: string } }).profiles?.full_name ?? "—"
  const voidedName = (sale as unknown as { voided?: { full_name: string } }).voided?.full_name

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/sales"><ArrowLeft className="size-4" /> Volver</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/print/${sale.id}?autoprint=1`} target="_blank" rel="noopener">
              <Printer className="size-4" /> Imprimir
            </a>
          </Button>
          {profile.role === "superuser" && sale.status === "completed" ? (
            <VoidSaleButton saleId={sale.id} />
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Venta #{sale.id}</span>
            {sale.status === "voided" ? (
              <Badge variant="destructive"><Ban className="size-3" /> {SALE_STATUS_LABELS[sale.status]}</Badge>
            ) : (
              <Badge variant="secondary">{SALE_STATUS_LABELS[sale.status]}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Fecha:</span> {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}</div>
          <div><span className="text-muted-foreground">Cajero:</span> {cashierName}</div>
          <div><span className="text-muted-foreground">Subtotal:</span> {formatARS(sale.subtotal)}</div>
          <div><span className="text-muted-foreground">IVA:</span> {formatARS(sale.iva_total)}</div>
          <div className="sm:col-span-2 text-base"><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{formatARS(sale.total)}</span></div>
          {sale.status === "voided" ? (
            <>
              <Separator className="sm:col-span-2 my-2" />
              <div className="sm:col-span-2 text-destructive">
                Anulada {sale.voided_at ? `el ${format(new Date(sale.voided_at), "dd/MM/yyyy HH:mm")}` : ""}
                {voidedName ? ` por ${voidedName}` : ""}.
              </div>
              {sale.void_reason ? <div className="sm:col-span-2">Motivo: {sale.void_reason}</div> : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">P. Unit.</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.product_name}</TableCell>
                  <TableCell className="text-right">{formatQuantity(it.quantity, it.unit)} {unitAbbrev(it.unit)}</TableCell>
                  <TableCell className="text-right">{formatARS(it.unit_price)}</TableCell>
                  <TableCell className="text-right">{Number(it.iva_rate)}%</TableCell>
                  <TableCell className="text-right">{formatARS(it.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pagos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{paymentMethodLabel(p.method)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.reference ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatARS(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
