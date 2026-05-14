"use client"

import { useMemo, useState } from "react"
import { Loader2, Plus, Trash2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatARS, round2 } from "@/lib/money"
import { PAYMENT_METHODS } from "@/lib/constants"

type PaymentLine = {
  method: string
  amount: string
  reference?: string
}

export function PaymentDialog({
  total,
  submitting,
  onConfirm,
  onCancel,
}: {
  total: number
  submitting: boolean
  onConfirm: (payments: Array<{ method: string; amount: number; reference?: string }>) => void
  onCancel: () => void
}) {
  const [lines, setLines] = useState<PaymentLine[]>([
    { method: "efectivo", amount: total.toFixed(2) },
  ])

  const parsedLines = useMemo(
    () =>
      lines.map((l) => ({
        ...l,
        amountN: Number((l.amount || "0").replace(",", ".")) || 0,
      })),
    [lines],
  )

  const paid = round2(parsedLines.reduce((acc, l) => acc + l.amountN, 0))
  const change = round2(paid - total)
  const hasCash = parsedLines.some((l) => l.method === "efectivo" && l.amountN > 0)
  const nonCashSum = round2(
    parsedLines.filter((l) => l.method !== "efectivo").reduce((acc, l) => acc + l.amountN, 0),
  )
  const cashSum = round2(
    parsedLines.filter((l) => l.method === "efectivo").reduce((acc, l) => acc + l.amountN, 0),
  )

  // Confirm rules:
  // - all non-cash totals must fit inside the bill (no over-charging electronic methods)
  // - paid >= total (cash overpayment produces vuelto)
  const canConfirm =
    paid >= total - 0.005 &&
    nonCashSum <= total + 0.005 &&
    parsedLines.every((l) => l.amountN > 0)

  function addLine() {
    setLines((prev) => [...prev, { method: "debito", amount: "0.00" }])
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }
  function updateLine(idx: number, patch: Partial<PaymentLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function autoBalanceCash() {
    const remaining = round2(total - nonCashSum)
    setLines((prev) => {
      const cashIdx = prev.findIndex((l) => l.method === "efectivo")
      if (cashIdx >= 0) {
        return prev.map((l, i) => (i === cashIdx ? { ...l, amount: remaining.toFixed(2) } : l))
      }
      return [...prev, { method: "efectivo", amount: remaining.toFixed(2) }]
    })
  }

  function confirm() {
    onConfirm(
      parsedLines.map((l) => ({
        method: l.method,
        amount: round2(l.amountN),
        reference: l.reference?.trim() || undefined,
      })),
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submitting) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Cobrar — {formatARS(total)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {idx === 0 ? <Label className="mb-1 text-xs">Método</Label> : null}
                <select
                  value={line.method}
                  onChange={(e) => updateLine(idx, { method: e.target.value })}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  disabled={submitting}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-4">
                {idx === 0 ? <Label className="mb-1 text-xs">Monto</Label> : null}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.amount}
                  onChange={(e) => updateLine(idx, { amount: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div className="col-span-3">
                {idx === 0 ? <Label className="mb-1 text-xs">Ref. (opcional)</Label> : null}
                <Input
                  placeholder="Últ. 4 / ID"
                  value={line.reference ?? ""}
                  onChange={(e) => updateLine(idx, { reference: e.target.value })}
                  disabled={submitting || line.method === "efectivo"}
                />
              </div>
              <div className="col-span-1 flex">
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(idx)}
                    disabled={submitting}
                    title="Quitar"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={submitting}>
              <Plus className="size-4" /> Agregar pago
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={autoBalanceCash} disabled={submitting}>
              Completar efectivo
            </Button>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Total</span><span className="font-medium">{formatARS(total)}</span></div>
            <div className="flex justify-between"><span>Pagado</span><span className="font-medium">{formatARS(paid)}</span></div>
            {nonCashSum > 0 ? (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Electrónico: {formatARS(nonCashSum)}</span>
                <span>Efectivo: {formatARS(cashSum)}</span>
              </div>
            ) : null}
            {hasCash && paid > total ? (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Vuelto</span><span>{formatARS(change)}</span>
              </div>
            ) : null}
            {!canConfirm && paid < total ? (
              <div className="text-xs text-amber-700">Falta {formatARS(total - paid)}</div>
            ) : null}
            {nonCashSum > total + 0.005 ? (
              <div className="text-xs text-destructive">
                Los pagos electrónicos no pueden superar el total. Reducí o usá efectivo para vuelto.
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>Cancelar</Button>
          <Button onClick={confirm} disabled={!canConfirm || submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Confirmar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
