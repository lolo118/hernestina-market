import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { requireSuperuser } from "@/lib/auth"
import { ROLE_LABELS } from "@/lib/constants"
import { CreateUserForm } from "@/components/users/create-user-form"
import { UserActions } from "@/components/users/user-actions"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  await requireSuperuser()
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: profiles }, { data: authList }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }).then((r) => ({ data: r.data?.users ?? [] })),
  ])

  const authMap = new Map((authList ?? []).map((u) => [u.id, u]))

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Cuentas que pueden ingresar al sistema.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Crear usuario</CardTitle></CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cuentas existentes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin usuarios.</TableCell></TableRow>
              ) : null}
              {profiles?.map((p) => {
                const auth = authMap.get(p.id)
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.full_name}</TableCell>
                    <TableCell>{auth?.email ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{ROLE_LABELS[p.role]}</Badge></TableCell>
                    <TableCell>
                      {p.active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {auth?.last_sign_in_at ? format(new Date(auth.last_sign_in_at), "dd/MM/yyyy HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      <UserActions userId={p.id} active={p.active} email={auth?.email ?? null} />
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
