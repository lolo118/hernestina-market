"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Save, ArchiveX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UNITS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Product, Section } from "@/lib/supabase/database.types"

const schema = z.object({
  name: z.string().min(1, "Requerido"),
  description: z.string().optional(),
  section_id: z.coerce.number().int().positive(),
  unit: z.string().min(1),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  iva_rate: z.coerce.number().min(0).max(100),
  stock: z.coerce.number().min(0),
  min_stock: z.coerce.number().min(0),
  active: z.boolean().default(true),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

export function ProductForm({
  initial,
  sections,
}: {
  initial?: Product
  sections: Section[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      section_id: initial?.section_id ?? sections[0]?.id ?? 1,
      unit: initial?.unit ?? "un",
      barcode: initial?.barcode ?? "",
      sku: initial?.sku ?? "",
      cost: Number(initial?.cost ?? 0),
      price: Number(initial?.price ?? 0),
      iva_rate: Number(initial?.iva_rate ?? sections[0]?.default_iva_rate ?? 21),
      stock: Number(initial?.stock ?? 0),
      min_stock: Number(initial?.min_stock ?? 0),
      active: initial?.active ?? true,
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const supabase = createClient()
      const payload = {
        ...values,
        barcode: values.barcode || null,
        sku: values.sku || null,
        description: values.description || null,
      }
      if (initial) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id)
        if (error) {
          toast.error("Error al guardar: " + error.message)
          return
        }
        toast.success("Producto actualizado")
      } else {
        const { error } = await supabase.from("products").insert(payload)
        if (error) {
          toast.error("Error al crear: " + error.message)
          return
        }
        toast.success("Producto creado")
      }
      router.replace("/products")
      router.refresh()
    })
  }

  async function onDeactivate() {
    if (!initial) return
    if (!confirm("¿Desactivar este producto? No se borra para preservar historial.")) return
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from("products").update({ active: false }).eq("id", initial.id)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Producto desactivado")
      router.replace("/products")
      router.refresh()
    })
  }

  const selectedSection = sections.find((s) => s.id === Number(form.watch("section_id")))
  const ivaDefault = selectedSection?.default_iva_rate

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Datos principales</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" autoFocus {...form.register("name")} />
            {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" rows={2} {...form.register("description")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="section_id">Sección</Label>
            <select
              id="section_id"
              {...form.register("section_id", { valueAsNumber: true })}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {ivaDefault ? (
              <p className="text-xs text-muted-foreground">IVA por defecto: {ivaDefault}%</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="unit">Unidad</Label>
            <select id="unit" {...form.register("unit")} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="barcode">Código de barras</Label>
            <Input id="barcode" {...form.register("barcode")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...form.register("sku")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Precio e IVA</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cost">Costo</Label>
            <Input id="cost" type="number" step="0.01" min="0" {...form.register("cost")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="price">Precio (IVA incl.)</Label>
            <Input id="price" type="number" step="0.01" min="0" {...form.register("price")} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="iva_rate">Alícuota IVA %</Label>
            <Input id="iva_rate" type="number" step="0.01" min="0" max="100" {...form.register("iva_rate")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="stock">Stock actual</Label>
            <Input id="stock" type="number" step="0.001" min="0" {...form.register("stock")} />
            {initial ? (
              <p className="text-xs text-muted-foreground">Para ajustes preferí usar el formulario de Stock.</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="min_stock">Stock mínimo</Label>
            <Input id="min_stock" type="number" step="0.001" min="0" {...form.register("min_stock")} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("active")} className="size-4" />
              Activo
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex items-center justify-end gap-2">
        {initial && initial.active ? (
          <Button type="button" variant="outline" onClick={onDeactivate} disabled={pending}>
            <ArchiveX className="size-4" /> Desactivar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar
        </Button>
      </div>
    </form>
  )
}
