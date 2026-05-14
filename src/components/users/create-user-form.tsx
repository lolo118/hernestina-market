"use client"

import { useTransition, useState } from "react"
import { toast } from "sonner"
import { Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUserAction } from "@/app/(app)/users/actions"

export function CreateUserForm() {
  const [pending, startTransition] = useTransition()
  const [showPwd, setShowPwd] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const passwordEl = (e.currentTarget.querySelector("#password") as HTMLInputElement) ?? null
    startTransition(async () => {
      const res = await createUserAction(form)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Usuario creado")
      e.currentTarget.reset()
      if (passwordEl) passwordEl.value = ""
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-5 items-end">
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contraseña</Label>
        <div className="flex gap-1">
          <Input id="password" name="password" type={showPwd ? "text" : "password"} required minLength={8} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPwd((v) => !v)}>{showPwd ? "Ocultar" : "Ver"}</Button>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="role">Rol</Label>
        <select id="role" name="role" defaultValue="cashier" className="h-9 w-full rounded-md border bg-background px-2 text-sm">
          <option value="cashier">Cajero</option>
          <option value="superuser">Superusuario</option>
        </select>
      </div>
      <div className="md:col-span-5 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Crear usuario
        </Button>
      </div>
    </form>
  )
}
