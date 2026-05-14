"use client"

import { Printer, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { formatARS, formatQuantity } from "@/lib/money"
import { paymentMethodLabel, unitAbbrev, STORE_NAME } from "@/lib/constants"
import type { AppSettings } from "@/lib/supabase/database.types"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type SaleSummary = {
  saleId: number
  items: Array<{
    product_name: string
    quantity: number
    unit: string
    unit_price: number
    iva_rate: number
    subtotal: number
  }>
  payments: Array<{ method: string; amount: number; reference?: string | null }>
  subtotal: number
  iva_total: number
  total: number
  created_at: string
}

export function ReceiptDialog({
  sale,
  cashierName,
  store,
  onClose,
}: {
  sale: SaleSummary
  cashierName: string
  store: AppSettings | null
  onClose: () => void
}) {
  const storeName = store?.store_name ?? STORE_NAME
  const totalPaid = sale.payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const change = totalPaid - sale.total

  function openPrint() {
    window.open(`/print/${sale.saleId}?autoprint=1`, "_blank", "noopener,width=420,height=720")
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ticket #{sale.saleId}</DialogTitle>
        </DialogHeader>
        <div className="font-mono text-xs space-y-1">
          <div className="text-center font-semibold text-sm">{storeName}</div>
          {store?.address ? <div className="text-center text-muted-foreground">{store.address}</div> : null}
          {store?.cuit ? <div className="text-center text-muted-foreground">CUIT {store.cuit}</div> : null}
          <Separator />
          <div>Ticket #{sale.saleId}</div>
          <div>Fecha: {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</div>
          <div>Cajero: {cashierName}</div>
          <Separator />
          <table className="w-full">
            <tbody>
              {sale.items.map((it, i) => (
                <tr key={i}>
                  <td>
                    {it.product_name}
                    <div className="text-[10px] text-muted-foreground">
                      {formatQuantity(it.quantity, it.unit)} {unitAbbrev(it.unit)} × {formatARS(it.unit_price)}
                    </div>
                  </td>
                  <td className="text-right whitespace-nowrap align-top">{formatARS(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Separator />
          <div className="flex justify-between"><span>Subtotal (sin IVA)</span><span>{formatARS(sale.subtotal)}</span></div>
          <div className="flex justify-between"><span>IVA</span><span>{formatARS(sale.iva_total)}</span></div>
          <div className="flex justify-between font-semibold text-sm"><span>TOTAL</span><span>{formatARS(sale.total)}</span></div>
          <Separator />
          <div className="font-medium">Pagos</div>
          {sale.payments.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span>{paymentMethodLabel(p.method)}{p.reference ? ` (${p.reference})` : ""}</span>
              <span>{formatARS(p.amount)}</span>
            </div>
          ))}
          {change > 0.005 ? (
            <div className="flex justify-between font-semibold"><span>Vuelto</span><span>{formatARS(change)}</span></div>
          ) : null}
          {store?.receipt_footer ? (
            <>
              <Separator />
              <div className="text-center">{store.receipt_footer}</div>
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><Check className="size-4" /> Cerrar</Button>
          <Button onClick={openPrint}><Printer className="size-4" /> Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
