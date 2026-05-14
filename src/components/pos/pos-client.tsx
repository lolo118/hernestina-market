"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, ShoppingCart, X, Plus, Minus, ScanLine, CircleDot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatARS, formatQuantity, round3, round2 } from "@/lib/money"
import { unitAbbrev, WEIGHED_UNITS } from "@/lib/constants"
import type { Section, AppSettings } from "@/lib/supabase/database.types"
import { WeightDialog } from "@/components/pos/weight-dialog"
import { PaymentDialog } from "@/components/pos/payment-dialog"
import { ReceiptDialog } from "@/components/pos/receipt-dialog"

type POSProduct = {
  id: number
  name: string
  barcode: string | null
  unit: string
  price: number
  iva_rate: number
  stock: number
  section_id: number
}

type CartLine = {
  product: POSProduct
  quantity: number
}

type SuccessfulSale = {
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

export function POSClient({
  cashierId,
  cashierName,
  sessionId,
  products,
  sections,
  storeSettings,
}: {
  cashierId: string
  cashierName: string
  sessionId: number
  products: POSProduct[]
  sections: Section[]
  storeSettings: AppSettings | null
}) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState("")
  const [activeSection, setActiveSection] = useState<number | "all">("all")
  const [barcode, setBarcode] = useState("")
  const [weightTarget, setWeightTarget] = useState<POSProduct | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastSale, setLastSale] = useState<SuccessfulSale | null>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    barcodeRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => (activeSection === "all" ? true : p.section_id === activeSection))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.barcode ?? "").includes(q))
      .slice(0, 60)
  }, [products, search, activeSection])

  const totals = useMemo(() => {
    let subtotal = 0
    let iva = 0
    let total = 0
    for (const line of cart) {
      const lineTotal = round2(line.quantity * Number(line.product.price))
      const lineIva = round2(lineTotal - lineTotal / (1 + Number(line.product.iva_rate) / 100))
      const lineSub = round2(lineTotal - lineIva)
      subtotal += lineSub
      iva += lineIva
      total += lineTotal
    }
    return { subtotal: round2(subtotal), iva: round2(iva), total: round2(total) }
  }, [cart])

  const addToCart = useCallback((product: POSProduct, qty: number) => {
    if (qty <= 0) return
    setCart((prev) => {
      const existing = prev.findIndex((l) => l.product.id === product.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { ...next[existing], quantity: round3(next[existing].quantity + qty) }
        return next
      }
      return [...prev, { product, quantity: round3(qty) }]
    })
    setSearch("")
  }, [])

  const handleProductClick = useCallback(
    (product: POSProduct) => {
      if (WEIGHED_UNITS.includes(product.unit as never)) {
        setWeightTarget(product)
      } else {
        addToCart(product, 1)
      }
    },
    [addToCart],
  )

  const handleBarcodeSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const value = barcode.trim()
      setBarcode("")
      if (!value) return
      const match = products.find((p) => p.barcode === value)
      if (!match) {
        toast.error(`Sin coincidencia para "${value}"`)
        return
      }
      handleProductClick(match)
    },
    [barcode, handleProductClick, products],
  )

  function updateLineQty(productId: number, qty: number) {
    setCart((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, quantity: round3(Math.max(0.001, qty)) } : l)),
    )
  }

  function removeLine(productId: number) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId))
  }

  function clearCart() {
    if (cart.length === 0) return
    if (!confirm("¿Vaciar el carrito?")) return
    setCart([])
    setTimeout(() => barcodeRef.current?.focus(), 0)
  }

  async function submitSale(payments: Array<{ method: string; amount: number; reference?: string }>) {
    setSubmitting(true)
    try {
      const items = cart.map((l) => ({
        product_id: l.product.id,
        quantity: l.quantity,
        unit_price: Number(l.product.price),
        iva_rate: Number(l.product.iva_rate),
      }))
      const body = { sessionId, items, payments }
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? "Error al registrar la venta")
        return
      }
      setLastSale({
        saleId: json.saleId,
        items: cart.map((l) => {
          const lineTotal = round2(l.quantity * Number(l.product.price))
          return {
            product_name: l.product.name,
            quantity: l.quantity,
            unit: l.product.unit,
            unit_price: Number(l.product.price),
            iva_rate: Number(l.product.iva_rate),
            subtotal: lineTotal,
          }
        }),
        payments,
        subtotal: totals.subtotal,
        iva_total: totals.iva,
        total: totals.total,
        created_at: new Date().toISOString(),
      })
      setCart([])
      setPaymentOpen(false)
      toast.success(`Venta #${json.saleId} registrada`)
    } catch (err) {
      toast.error("Error de red: " + (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function closeReceipt() {
    setLastSale(null)
    setTimeout(() => barcodeRef.current?.focus(), 0)
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left: catalog */}
      <div className="flex-1 flex flex-col p-3 lg:p-4 gap-3 overflow-hidden">
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={barcodeRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Escaneá o ingresá código de barras…"
              className="pl-9 h-11 text-base"
              autoFocus
            />
          </div>
          <Button type="submit" className="h-11">Agregar</Button>
        </form>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Tabs
            value={activeSection === "all" ? "all" : String(activeSection)}
            onValueChange={(v) => setActiveSection(v === "all" ? "all" : Number(v))}
          >
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              {sections.map((s) => (
                <TabsTrigger key={s.id} value={String(s.id)}>{s.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-8 text-sm">
                Sin resultados.
              </div>
            ) : null}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProductClick(p)}
                className="text-left p-3 rounded-lg border bg-card hover:bg-accent active:bg-accent/70 transition-colors"
              >
                <div className="text-sm font-medium line-clamp-2">{p.name}</div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Stock: {formatQuantity(p.stock, p.unit)} {unitAbbrev(p.unit)}
                  </span>
                  <span className="font-semibold">{formatARS(p.price)}</span>
                </div>
                {WEIGHED_UNITS.includes(p.unit as never) ? (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    <CircleDot className="size-3" /> Pesable
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: cart */}
      <aside className="w-full lg:w-[26rem] border-t lg:border-t-0 lg:border-l bg-background flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <ShoppingCart className="size-4" /> Ticket actual
          </div>
          <Button variant="ghost" size="sm" onClick={clearCart} disabled={cart.length === 0}>
            <X className="size-4" /> Vaciar
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              El carrito está vacío. Escaneá o tocá un producto.
            </div>
          ) : (
            <ul className="divide-y">
              {cart.map((line) => {
                const lineTotal = round2(line.quantity * Number(line.product.price))
                return (
                  <li key={line.product.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium">{line.product.name}</div>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeLine(line.product.id)}
                        aria-label="Eliminar"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        {WEIGHED_UNITS.includes(line.product.unit as never) ? (
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded border text-xs"
                            onClick={() => setWeightTarget(line.product)}
                          >
                            {formatQuantity(line.quantity, line.product.unit)} {unitAbbrev(line.product.unit)}
                          </button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              type="button"
                              className="size-7"
                              onClick={() => updateLineQty(line.product.id, line.quantity - 1)}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="tabular-nums w-6 text-center">{line.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              type="button"
                              className="size-7"
                              onClick={() => updateLineQty(line.product.id, line.quantity + 1)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{formatARS(line.product.price)} c/u</div>
                        <div className="font-semibold">{formatARS(lineTotal)}</div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <Separator />
        <div className="p-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal (sin IVA)</span><span>{formatARS(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA</span><span>{formatARS(totals.iva)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span><span>{formatARS(totals.total)}</span>
          </div>
        </div>
        <div className="p-3 border-t">
          <Button
            className="w-full h-12 text-base"
            disabled={cart.length === 0 || submitting}
            onClick={() => setPaymentOpen(true)}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Cobrar"}
          </Button>
        </div>
        <div className="px-3 pb-3 text-xs text-muted-foreground">
          Cajero: {cashierName} · Caja #{sessionId}
        </div>
      </aside>

      {weightTarget ? (
        <WeightDialog
          product={weightTarget}
          existingQty={cart.find((l) => l.product.id === weightTarget.id)?.quantity}
          onCancel={() => setWeightTarget(null)}
          onConfirm={(qty) => {
            const existing = cart.findIndex((l) => l.product.id === weightTarget.id)
            if (existing >= 0) {
              updateLineQty(weightTarget.id, qty)
            } else {
              addToCart(weightTarget, qty)
            }
            setWeightTarget(null)
            setTimeout(() => barcodeRef.current?.focus(), 0)
          }}
        />
      ) : null}

      {paymentOpen ? (
        <PaymentDialog
          total={totals.total}
          submitting={submitting}
          onCancel={() => setPaymentOpen(false)}
          onConfirm={(payments) => submitSale(payments)}
        />
      ) : null}

      {lastSale ? (
        <ReceiptDialog
          cashierName={cashierName}
          sale={lastSale}
          store={storeSettings}
          onClose={closeReceipt}
        />
      ) : null}

    </div>
  )
}
