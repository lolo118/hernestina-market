"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { formatARS, round3 } from "@/lib/money"
import { unitAbbrev } from "@/lib/constants"

type Product = {
  id: number
  name: string
  unit: string
  price: number
}

export function WeightDialog({
  product,
  existingQty,
  onConfirm,
  onCancel,
}: {
  product: Product
  existingQty?: number
  onConfirm: (qty: number) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(existingQty ? String(existingQty) : "")
  useEffect(() => {
    setValue(existingQty ? String(existingQty) : "")
  }, [existingQty, product.id])

  const num = Number((value || "0").replace(",", "."))
  const total = round3(num * Number(product.price))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!num || num <= 0) return
    onConfirm(round3(num))
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Ingresá el peso o cantidad en {unitAbbrev(product.unit)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="qty">Cantidad ({unitAbbrev(product.unit)})</Label>
            <Input
              id="qty"
              type="number"
              step="0.001"
              min="0.001"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="h-12 text-lg"
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm flex items-center justify-between">
            <span>Precio: {formatARS(product.price)} / {unitAbbrev(product.unit)}</span>
            <span className="font-semibold">{formatARS(total)}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={!num || num <= 0}>Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
