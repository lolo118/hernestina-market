import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { formatARS } from "@/lib/money"
import { OpenSessionForm } from "@/components/forms/open-session-form"

export const dynamic = "force-dynamic"

export default async function CashSessionsPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  let q = supabase
    .from("cash_sessions")
    .select("*, profiles:cashier_id(full_name)")
    .order("opened_at", { ascending: false })
    .limit(100)
  if (profile.role !== "superuser") q = q.eq("cashier_id", profile.id)

  const { data: sessions } = await q
  const open = sessions?.find((s) => s.status === "open" && s.cashier_id === profile.id)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Cajas</h1>
        <p className="text-sm text-muted-foreground">Apertura y cierre de turnos de caja.</p>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tu caja está abierta</span>
              <Badge variant="secondary">Abierta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-muted-foreground">Sesión:</span> #{open.id}</div>
            <div><span className="text-muted-foreground">Abierta:</span> {format(new Date(open.opened_at), "dd/MM/yyyy HH:mm")}</div>
            <div><span className="text-muted-foreground">Apertura:</span> {formatARS(open.opening_cash)}</div>
            <div className="flex gap-2 pt-2">
              <Button asChild>
                <Link href={`/cash-sessions/${open.id}`}>Ver / cerrar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Abrir caja</CardTitle>
          </CardHeader>
          <CardContent>
            <OpenSessionForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sesión</TableHead>
                {profile.role === "superuser" ? <TableHead>Cajero</TableHead> : null}
                <TableHead>Apertura</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Contado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={profile.role === "superuser" ? 9 : 8} className="text-center text-muted-foreground py-8">
                    Sin sesiones registradas.
                  </TableCell>
                </TableRow>
              ) : null}
              {sessions?.map((s) => {
                const cashier = (s as unknown as { profiles?: { full_name: string } }).profiles
                const diff = s.difference ? Number(s.difference) : null
                return (
                  <TableRow key={s.id}>
                    <TableCell>#{s.id}</TableCell>
                    {profile.role === "superuser" ? <TableCell>{cashier?.full_name ?? "—"}</TableCell> : null}
                    <TableCell>{format(new Date(s.opened_at), "dd/MM HH:mm")}</TableCell>
                    <TableCell>{s.closed_at ? format(new Date(s.closed_at), "dd/MM HH:mm") : "—"}</TableCell>
                    <TableCell className="text-right">{s.expected_cash != null ? formatARS(s.expected_cash) : "—"}</TableCell>
                    <TableCell className="text-right">{s.counted_cash != null ? formatARS(s.counted_cash) : "—"}</TableCell>
                    <TableCell className={`text-right ${diff != null && Math.abs(diff) > 0.005 ? (diff < 0 ? "text-destructive" : "text-emerald-700") : ""}`}>
                      {diff != null ? formatARS(diff) : "—"}
                    </TableCell>
                    <TableCell>
                      {s.status === "open" ? (
                        <Badge variant="secondary">Abierta</Badge>
                      ) : (
                        <Badge variant="outline">Cerrada</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/cash-sessions/${s.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
