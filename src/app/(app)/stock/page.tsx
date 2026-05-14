import Link from "next/link"
import { Plus, History, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/auth"
import { formatQuantity, formatARS } from "@/lib/money"
import { unitAbbrev } from "@/lib/constants"

export const dynamic = "force-dynamic"

type SearchParams = Promise<{ section?: string }>

export default async function StockPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile()
  const { section } = await searchParams
  const supabase = await createClient()
  const sections = await supabase.from("sections").select("*").order("id")
  const sectionFilter = sections.data?.find((s) => s.code === section)?.id

  let query = supabase
    .from("products")
    .select("id,name,unit,stock,min_stock,price,active,sections(name,code)")
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(1000)
  if (sectionFilter) query = query.eq("section_id", sectionFilter)

  const products = await query

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            Stock disponible por producto y sección.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/stock/entries">
              <History className="size-4" /> Historial
            </Link>
          </Button>
          {profile.role === "superuser" ? (
            <Button asChild>
              <Link href="/stock/entries/new">
                <Plus className="size-4" /> Movimiento
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="p-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
          <SectionChip href="/stock" active={!section}>Todas</SectionChip>
          {sections.data?.map((s) => (
            <SectionChip key={s.id} href={`/stock?section=${s.code}`} active={section === s.code}>
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
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay productos.
                </TableCell>
              </TableRow>
            ) : null}
            {products.data?.map((p) => {
              const low = Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0
              const sectionName = (p as unknown as { sections?: { name: string } }).sections?.name ?? "—"
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{sectionName}</TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(p.stock, p.unit)} {unitAbbrev(p.unit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(p.min_stock, p.unit)} {unitAbbrev(p.unit)}
                  </TableCell>
                  <TableCell className="text-right">{formatARS(p.price)}</TableCell>
                  <TableCell>
                    {low ? (
                      <Badge variant="destructive">
                        <AlertTriangle className="size-3" /> Stock bajo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
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
