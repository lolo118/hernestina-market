"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { formatARS } from "@/lib/money"

export function CloseSessionForm({
  sessionId,
  expectedCash,
}: {
  sessionId: number
  expectedCash: number
}) {
  const router = useRouter()
  const [counted, setCounted] = useState(expectedCash.toFixed(2))
  const [notes, setNotes] = useState("")
  const [pending, startTransition] = useTransition()

  const countedN = Number((counted || "0").replace(",", "."))
  const diff = countedN - expectedCash

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!Number.isFinite(countedN) || countedN < 0) {
      toast.error("Monto inválido")
      return
    }
    if (!confirm("¿Cerrar la caja? Esta acción no se puede deshacer.")) return
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc("close_cash_session", {
        p_session_id: sessionId,
        p_counted_cash: countedN,
        p_notes: notes.trim() || null,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Caja cerrada")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-sm flex justify-between bg-muted/40 rounded-md p-2">
        <span>Efectivo esperado</span>
        <span className="font-medium">{formatARS(expectedCash)}</span>
      </div>
      <div className="space-y-1">
        <Label htmlFor="counted">Efectivo contado</Label>
        <Input id="counted" type="number" step="0.01" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} />
      </div>
      <div className={`text-sm ${Math.abs(diff) > 0.005 ? (diff < 0 ? "text-destructive" : "text-emerald-700") : ""}`}>
        Diferencia: {formatARS(diff)}
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Cerrar caja
      </Button>
    </form>
  )
}
