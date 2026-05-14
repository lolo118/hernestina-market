"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/supabase/database.types"

const schema = z.object({
  product_id: z.coerce.number().int().positive(),
  type: z.enum(["entry", "adjustment", "loss"]),
  quantity: z.coerce.number().refine((v) => v !== 0, "La cantidad no puede ser 0"),
  unit_cost: z.coerce.number().min(0).optional().or(z.literal("")),
  reason: z.string().optional(),
  update_cost: z.boolean().default(false),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

export function StockEntryForm({ products }: { products: Product[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState("")

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_id: products[0]?.id ?? 0,
      type: "entry",
      quantity: 0,
      unit_cost: "" as unknown as number,
      reason: "",
      update_cost: false,
    },
  })

  const filtered = products
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 200)

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc("register_stock_entry", {
        p_product_id: values.product_id,
        p_quantity: values.type === "loss" ? -Math.abs(Number(values.quantity)) : Number(values.quantity),
        p_unit_cost: values.unit_cost === ("" as unknown) ? null : Number(values.unit_cost),
        p_reason: values.reason || null,
        p_update_cost: !!values.update_cost,
        p_type: values.type,
      })
      if (error) {
        toast.error("Error: " + error.message)
        return
      }
      toast.success("Movimiento registrado")
      router.replace("/stock/entries")
      router.refresh()
    })
  }

  const type = form.watch("type")

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Producto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Filtrar productos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product_id">Producto</Label>
            <select
              id="product_id"
              {...form.register("product_id", { valueAsNumber: true })}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              size={Math.min(8, Math.max(4, filtered.length))}
            >
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — stock {p.stock} {p.unit}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Movimiento</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1">
            <Label htmlFor="type">Tipo</Label>
            <select id="type" {...form.register("type")} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="entry">Ingreso (suma stock)</option>
              <option value="adjustment">Ajuste (positivo o negativo)</option>
              <option value="loss">Pérdida / merma (resta stock)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="quantity">
              Cantidad {type === "loss" ? "(positiva — se descuenta)" : type === "adjustment" ? "(positiva o negativa)" : "(positiva)"}
            </Label>
            <Input id="quantity" type="number" step="0.001" {...form.register("quantity")} />
            {form.formState.errors.quantity ? (
              <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Costo y motivo</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1">
            <Label htmlFor="unit_cost">Costo unitario (opcional)</Label>
            <Input id="unit_cost" type="number" step="0.01" min="0" {...form.register("unit_cost")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("update_cost")} className="size-4" />
            Actualizar costo del producto con este valor
          </label>
          <div className="space-y-1">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea id="reason" rows={2} {...form.register("reason")} />
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex items-center justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Registrar
        </Button>
      </div>
    </form>
  )
}
