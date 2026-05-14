import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { requireSuperuser } from "@/lib/auth"

export const dynamic = "force-dynamic"

type SearchParams = Promise<{
  entity?: string
  action?: string
  user?: string
  page?: string
}>

const PAGE_SIZE = 50

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperuser()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? "1"))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  let q = supabase
    .from("audit_log")
    .select("*, profiles:user_id(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (sp.entity) q = q.eq("entity", sp.entity)
  if (sp.action) q = q.eq("action", sp.action)
  if (sp.user) q = q.eq("user_id", sp.user)

  type AuditLogRow = {
    id: number
    created_at: string
    action: string
    entity: string
    entity_id: string | null
    user_id: string | null
    old_values: unknown
    new_values: unknown
    metadata: unknown
    profiles: { full_name: string } | null
  }
  const { data: logsRaw, count } = await q
  const logs = (logsRaw ?? []) as AuditLogRow[]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,full_name")
    .order("full_name")
    .returns<Array<{ id: string; full_name: string }>>()
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">Historial completo de cambios y acciones.</p>
      </div>

      <Card className="p-3">
        <form className="grid gap-2 md:grid-cols-5 items-end" action="/audit">
          <div className="space-y-1">
            <label className="text-xs">Entidad</label>
            <Input name="entity" defaultValue={sp.entity ?? ""} placeholder="products, sales, …" />
          </div>
          <div className="space-y-1">
            <label className="text-xs">Acción</label>
            <Input name="action" defaultValue={sp.action ?? ""} placeholder="INSERT, UPDATE, VOID_SALE…" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs">Usuario</label>
            <select name="user" defaultValue={sp.user ?? ""} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">Todos</option>
              {profiles?.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin eventos.
                </TableCell>
              </TableRow>
            ) : null}
            {logs.map((l) => {
              const userName = l.profiles?.full_name ?? "—"
              return (
                <TableRow key={l.id}>
                  <TableCell>{format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss")}</TableCell>
                  <TableCell>{userName}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell>{l.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{l.entity_id ?? "—"}</TableCell>
                  <TableCell>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Ver JSON</summary>
                      <pre className="mt-2 max-w-xl whitespace-pre-wrap break-all">
{JSON.stringify({ old: l.old_values, new: l.new_values, meta: l.metadata }, null, 2)}
                      </pre>
                    </details>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Página {page} de {totalPages} · {count ?? 0} eventos</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <a href={`?${new URLSearchParams({ ...stripPage(sp), page: String(page - 1) }).toString()}`}>Anterior</a>
            </Button>
          ) : null}
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <a href={`?${new URLSearchParams({ ...stripPage(sp), page: String(page + 1) }).toString()}`}>Siguiente</a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function stripPage(sp: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") out[k] = v
  return out
}
