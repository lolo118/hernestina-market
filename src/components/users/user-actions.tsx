"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { KeyRound, Power, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sendPasswordResetAction, toggleUserActiveAction } from "@/app/(app)/users/actions"

export function UserActions({
  userId,
  active,
  email,
}: {
  userId: string
  active: boolean
  email: string | null
}) {
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (!confirm(active ? "¿Desactivar este usuario?" : "¿Activar este usuario?")) return
    startTransition(async () => {
      const res = await toggleUserActiveAction(userId, !active)
      if ("error" in res) toast.error(res.error)
      else toast.success(active ? "Usuario desactivado" : "Usuario activado")
    })
  }

  function reset() {
    if (!email) {
      toast.error("Sin email asociado")
      return
    }
    if (!confirm(`Enviar email de reseteo a ${email}?`)) return
    startTransition(async () => {
      const res = await sendPasswordResetAction(userId)
      if ("error" in res) toast.error(res.error)
      else toast.success("Email enviado")
    })
  }

  return (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" onClick={reset} disabled={pending} title="Resetear contraseña">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
      </Button>
      <Button variant={active ? "outline" : "default"} size="sm" onClick={toggle} disabled={pending} title={active ? "Desactivar" : "Activar"}>
        <Power className="size-4" />
      </Button>
    </div>
  )
}
