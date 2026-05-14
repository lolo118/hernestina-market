"use client"

import { LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROLE_LABELS } from "@/lib/constants"

export function Topbar({
  fullName,
  role,
}: {
  fullName: string
  role: "superuser" | "cashier"
}) {
  return (
    <header className="flex items-center justify-between border-b px-4 md:px-6 h-14 bg-background">
      <div className="md:hidden font-semibold">Hernestina</div>
      <div className="flex-1" />
      <div className="flex items-center gap-3 text-sm">
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <User className="size-4" />
          <span className="text-foreground">{fullName}</span>
          <span>·</span>
          <span>{ROLE_LABELS[role] ?? role}</span>
        </div>
        <form action="/logout" method="post">
          <Button variant="ghost" size="sm" type="submit" title="Cerrar sesión">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
