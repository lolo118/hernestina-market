"use client"

import { Download, Loader2 } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toCSV, downloadCSV } from "@/lib/csv"
import { format } from "date-fns"

export function ReportsExportButton({ fromISO, toISO }: { fromISO: string; toISO: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("sales")
        .select("id,created_at,cashier_id,subtotal,iva_total,total,status,profiles:cashier_id(full_name)")
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .order("created_at")

      if (error) {
        toast.error(error.message)
        return
      }
      const rows = (data ?? []).map((s) => {
        const cashier = (s as unknown as { profiles?: { full_name: string } }).profiles
        return {
          venta: s.id,
          fecha: s.created_at,
          cajero: cashier?.full_name ?? "",
          subtotal: Number(s.subtotal).toFixed(2),
          iva: Number(s.iva_total).toFixed(2),
          total: Number(s.total).toFixed(2),
          estado: s.status,
        }
      })
      const csv = toCSV(rows, [
        { key: "venta", label: "N° Venta" },
        { key: "fecha", label: "Fecha" },
        { key: "cajero", label: "Cajero" },
        { key: "subtotal", label: "Subtotal" },
        { key: "iva", label: "IVA" },
        { key: "total", label: "Total" },
        { key: "estado", label: "Estado" },
      ])
      downloadCSV(`ventas_${format(new Date(fromISO), "yyyyMMdd")}_${format(new Date(toISO), "yyyyMMdd")}.csv`, csv)
    })
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Exportar CSV
    </Button>
  )
}
