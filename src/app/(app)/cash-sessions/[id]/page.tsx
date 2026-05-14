import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { formatARS } from "@/lib/money"
import { paymentMethodLabel } from "@/lib/constants"
import { CloseSessionForm } from "@/components/forms/close-session-form"
import type { CashSession } from "@/lib/supabase/database.types"

type Params = Promise<{ id: string }>
type SessionWithCashier = CashSession & { profiles?: { full_name: string } | null }

export default async function CashSessionDetailPage({ params }: { params: Params }) {
  const profile = await requireProfile()
  const { id } = await params
  const sessionId = Number(id)
  if (!Number.isFinite(sessionId)) notFound()

  const supabase = await createClient()
  const { data: sessionRaw } = await supabase
    .from("cash_sessions")
    .select("*, profiles:cashier_id(full_name)")
    .eq("id", sessionId)
    .maybeSingle()

  const session = sessionRaw as SessionWithCashier | null
  if (!session) notFound()
  if (session.cashier_id !== profile.id && profile.role !== "superuser") {
    redirect("/cash-sessions")
  }

  const cashierName = session.profiles?.full_name

  const [{ data: sales }, { data: payments }] = await Promise.all([
    supabase
      .from("sales")
      .select("id,total,status,created_at")
      .eq("cash_session_id", sessionId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sale_payments")
      .select("method,amount,sale_id,sales!inner(cash_session_id,status)")
      .eq("sales.cash_session_id", sessionId)
      .eq("sales.status", "completed"),
  ])

  const completed = (sales ?? []).filter((s) => s.status === "completed")
  const totalSold = completed.reduce((acc, s) => acc + Number(s.total), 0)
  const byMethod = new Map<string, number>()
  for (const p of payments ?? []) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount))
  }
  const cashIn = byMethod.get("efectivo") ?? 0
  const expected = Number(session.opening_cash ?? 0) + cashIn

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Caja #{session.id}</span>
            <Badge variant={session.status === "open" ? "secondary" : "outline"}>
              {session.status === "open" ? "Abierta" : "Cerrada"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Cajero:</span> {cashierName ?? "—"}</div>
          <div><span className="text-muted-foreground">Apertura:</span> {format(new Date(session.opened_at), "dd/MM/yyyy HH:mm")}</div>
          {session.closed_at ? (
            <div><span className="text-muted-foreground">Cierre:</span> {format(new Date(session.closed_at), "dd/MM/yyyy HH:mm")}</div>
          ) : null}
          <div><span className="text-muted-foreground">Efectivo inicial:</span> {formatARS(session.opening_cash)}</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Resumen del turno</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Tickets completados</span><span>{completed.length}</span></div>
            <div className="flex justify-between"><span>Total vendido</span><span className="font-medium">{formatARS(totalSold)}</span></div>
            <Separator className="my-2" />
            {Array.from(byMethod.entries()).map(([m, amt]) => (
              <div key={m} className="flex justify-between"><span>{paymentMethodLabel(m)}</span><span>{formatARS(amt)}</span></div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between"><span>Efectivo inicial</span><span>{formatARS(session.opening_cash)}</span></div>
            <div className="flex justify-between font-semibold"><span>Efectivo esperado</span><span>{formatARS(session.status === "closed" ? Number(session.expected_cash ?? 0) : expected)}</span></div>
            {session.counted_cash != null ? (
              <>
                <div className="flex justify-between"><span>Efectivo contado</span><span>{formatARS(session.counted_cash)}</span></div>
                <div className={`flex justify-between font-semibold ${session.difference != null && Number(session.difference) < 0 ? "text-destructive" : ""}`}>
                  <span>Diferencia</span><span>{formatARS(session.difference ?? 0)}</span>
                </div>
              </>
            ) : null}
            {session.notes ? <div className="pt-2 text-muted-foreground">Notas: {session.notes}</div> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cerrar caja</CardTitle></CardHeader>
          <CardContent>
            {session.status === "open" && session.cashier_id === profile.id ? (
              <CloseSessionForm sessionId={session.id} expectedCash={expected} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {session.status === "closed" ? "Esta caja ya fue cerrada." : "Solo el cajero asignado puede cerrarla."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ventas del turno</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>N°</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Sin ventas en este turno.
                  </TableCell>
                </TableRow>
              ) : null}
              {sales?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{format(new Date(s.created_at), "dd/MM HH:mm")}</TableCell>
                  <TableCell>#{s.id}</TableCell>
                  <TableCell className="text-right">{formatARS(s.total)}</TableCell>
                  <TableCell>
                    {s.status === "voided" ? <Badge variant="destructive">Anulada</Badge> : <Badge variant="secondary">Completada</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
