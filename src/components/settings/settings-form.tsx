"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { AppSettings } from "@/lib/supabase/database.types"

type FormValues = {
  store_name: string
  address: string
  cuit: string
  receipt_footer: string
}

export function SettingsForm({ initial }: { initial: AppSettings | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<FormValues>({
    defaultValues: {
      store_name: initial?.store_name ?? "Hernestina",
      address: initial?.address ?? "",
      cuit: initial?.cuit ?? "",
      receipt_footer: initial?.receipt_footer ?? "¡Gracias por su compra!",
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from("settings")
        .update({
          store_name: values.store_name.trim(),
          address: values.address.trim() || null,
          cuit: values.cuit.trim() || null,
          receipt_footer: values.receipt_footer.trim() || null,
        })
        .eq("id", 1)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Ajustes guardados")
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="store_name">Nombre del comercio</Label>
        <Input id="store_name" {...form.register("store_name", { required: true })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" {...form.register("address")} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cuit">CUIT</Label>
        <Input id="cuit" {...form.register("cuit")} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="receipt_footer">Mensaje al pie del ticket</Label>
        <Textarea id="receipt_footer" rows={2} {...form.register("receipt_footer")} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar
        </Button>
      </div>
    </form>
  )
}
