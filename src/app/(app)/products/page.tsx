import Link from "next/link"
import { Plus, Search, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { formatARS, formatQuantity } from "@/lib/money"
import { unitAbbrev } from "@/lib/constants"

export const dynamic = "force-dynamic"

type SearchParams = Promise<{ section?: string; q?: string; inactive?: string }>

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile()
  const { section, q, inactive } = await searchParams
  const supabase = await createClient()

  const sections = await supabase.from("sections").select("*").order("id")
  const sectionFilter = sections.data?.find((s) => s.code === section)?.id

  let query = supabase
    .from("products")
    .select("*, sections(name, code)")
    .order("name", { ascending: true })
    .limit(500)

  if (sectionFilter) query = query.eq("section_id", sectionFilter)
  if (q) query = query.ilike("name", `%${q}%`)
  if (inactive !== "1") query = query.eq("active", true)

  const products = await query

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-muted-foreground">
            {profile.role === "superuser"
              ? "Administrá el catálogo, precios y stock mínimo."
              : "Consultá el catálogo. Solo lectura."}
          </p>
        </div>
        {profile.role === "superuser" ? (
          <Button asChild>
            <Link href="/products/new">
              <Plus className="size-4" /> Nuevo producto
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="p-3 space-y-3">
        <form className="flex flex-col sm:flex-row gap-2 sm:items-center" action="/products">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Buscar por nombre…"
              defaultValue={q ?? ""}
              className="pl-8"
            />
          </div>
          {section ? <input type="hidden" name="section" value={section} /> : null}
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              name="inactive"
              value="1"
              defaultChecked={inactive === "1"}
              className="size-4"
            />
            Incluir inactivos
          </label>
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
          <SectionChip href={qs({ q, inactive })} active={!section}>Todos</SectionChip>
          {sections.data?.map((s) => (
            <SectionChip key={s.id} href={qs({ section: s.code, q, inactive })} active={section === s.code}>
              {s.name}
            </SectionChip>
          ))}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Sección</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mín.</TableHead>
              <TableHead>Estado</TableHead>
              {profile.role === "superuser" ? <TableHead></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={profile.role === "superuser" ? 7 : 6} className="text-center text-muted-foreground py-8">
                  No hay productos para mostrar.
                </TableCell>
              </TableRow>
            ) : null}
            {products.data?.map((p) => {
              const low = Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.barcode ? <div className="text-xs text-muted-foreground">CB: {p.barcode}</div> : null}
                  </TableCell>
                  <TableCell>{(p as unknown as { sections?: { name: string } }).sections?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatARS(p.price)}</TableCell>
                  <TableCell className={`text-right ${low ? "text-destructive font-medium" : ""}`}>
                    {formatQuantity(p.stock, p.unit)} {unitAbbrev(p.unit)}
                    {low ? <AlertTriangle className="inline size-3 ml-1" /> : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(p.min_stock, p.unit)} {unitAbbrev(p.unit)}
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <Badge variant="secondary">Activo</Badge>
                    ) : (
                      <Badge variant="outline">Inactivo</Badge>
                    )}
                  </TableCell>
                  {profile.role === "superuser" ? (
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/products/${p.id}/edit`}>Editar</Link>
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function qs(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) u.set(k, v)
  }
  const s = u.toString()
  return s ? `/products?${s}` : "/products"
}

function SectionChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-1 rounded-md text-sm transition-colors",
        active ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  )
}
