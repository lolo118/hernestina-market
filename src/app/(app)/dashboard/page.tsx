import Link from "next/link"
import { ShoppingCart, AlertTriangle, Receipt, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { formatARS, formatQuantity } from "@/lib/money"
import { startOfDay, endOfDay } from "date-fns"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  const [salesToday, lowStock, openSession] = await Promise.all([
    supabase
      .from("sales")
      .select("id,total,iva_total")
      .eq("status", "completed")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
    supabase.from("v_low_stock").select("*").limit(20),
    supabase
      .from("cash_sessions")
      .select("id,opening_cash,opened_at")
      .eq("cashier_id", profile.id)
      .eq("status", "open")
      .maybeSingle(),
  ])

  const sales = salesToday.data ?? []
  const totalToday = sales.reduce((acc, s) => acc + Number(s.total), 0)
  const ivaToday = sales.reduce((acc, s) => acc + Number(s.iva_total), 0)
  const avgTicket = sales.length ? totalToday / sales.length : 0

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inicio</h1>
          <p className="text-muted-foreground text-sm">
            Hola, {profile.full_name.split(" ")[0]}. Resumen del día.
          </p>
        </div>
        <Button asChild>
          <Link href="/pos">
            <ShoppingCart className="size-4" /> Ir a la caja
          </Link>
        </Button>
      </div>

      {!openSession.data ? (
        <Alert>
          <Wallet className="size-4" />
          <AlertTitle>No hay caja abierta</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Para vender, primero abrí tu caja con el efectivo inicial.</span>
            <Button asChild size="sm" variant="outline">
              <Link href="/cash-sessions">Abrir caja</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ventas hoy</CardDescription>
            <CardTitle className="text-2xl">{formatARS(totalToday)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{sales.length} ticket(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ticket promedio</CardDescription>
            <CardTitle className="text-2xl">{formatARS(avgTicket)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Promedio del día</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>IVA recaudado</CardDescription>
            <CardTitle className="text-2xl">{formatARS(ivaToday)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Sólo ventas completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock bajo</CardDescription>
            <CardTitle className="text-2xl">{lowStock.data?.length ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {lowStock.data?.length ? "Productos en alerta" : "Sin alertas"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              Productos con stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!lowStock.data?.length ? (
              <p className="text-sm text-muted-foreground">Todo en orden.</p>
            ) : (
              <ul className="space-y-2">
                {lowStock.data.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.section_name}</div>
                    </div>
                    <Badge variant="destructive">
                      {formatQuantity(p.stock, "kg")} / {formatQuantity(p.min_stock, "kg")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4" />
              Caja actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openSession.data ? (
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Apertura: </span>
                  {formatARS(openSession.data.opening_cash)}
                </div>
                <div className="text-muted-foreground">
                  Sesión #{openSession.data.id}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={`/cash-sessions/${openSession.data.id}`}>Ver detalle</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin caja abierta.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
