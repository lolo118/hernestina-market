"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function OpenSessionForm() {
  const router = useRouter()
  const [amount, setAmount] = useState("0.00")
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(amount.replace(",", "."))
    if (Number.isNaN(n) || n < 0) {
      toast.error("Monto inválido")
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc("open_cash_session", { p_opening_cash: n })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Caja abierta")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="space-y-1 flex-1">
        <Label htmlFor="opening">Efectivo inicial</Label>
        <Input
          id="opening"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
        Abrir caja
      </Button>
    </form>
  )
}
