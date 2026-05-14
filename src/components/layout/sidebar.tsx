"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  Wallet,
  BarChart3,
  ShieldAlert,
  Users,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_LABELS } from "@/lib/constants"

type Item = { href: string; label: string; icon: React.ElementType; super?: boolean }

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/pos", label: "Caja", icon: ShoppingCart },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/sales", label: "Ventas", icon: Receipt },
  { href: "/cash-sessions", label: "Cajas", icon: Wallet },
  { href: "/reports", label: "Reportes", icon: BarChart3, super: true },
  { href: "/audit", label: "Auditoría", icon: ShieldAlert, super: true },
  { href: "/users", label: "Usuarios", icon: Users, super: true },
  { href: "/settings", label: "Ajustes", icon: Settings, super: true },
]

export function Sidebar({
  role,
  fullName,
}: {
  role: "superuser" | "cashier"
  fullName: string
}) {
  const pathname = usePathname()
  const visible = ITEMS.filter((i) => !i.super || role === "superuser")
  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-5 border-b">
        <div className="text-xl font-semibold">Hernestina</div>
        <div className="text-xs text-muted-foreground">Caja & Stock</div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visible.map((it) => {
          const active =
            pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href + "/")) || (it.href !== "/dashboard" && pathname.startsWith(it.href))
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <Icon className="size-4" />
              {it.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t text-xs">
        <div className="font-medium">{fullName}</div>
        <div className="text-muted-foreground">{ROLE_LABELS[role] ?? role}</div>
      </div>
    </aside>
  )
}
