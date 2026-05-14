import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderReceiptHTML } from "@/lib/receipt"
import { STORE_NAME } from "@/lib/constants"

type Params = Promise<{ saleId: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const { saleId } = await params
  const id = Number(saleId)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const [{ data: sale }, { data: items }, { data: payments }, { data: settings }] = await Promise.all([
    supabase.from("sales").select("*").eq("id", id).maybeSingle(),
    supabase.from("sale_items").select("*").eq("sale_id", id).order("id"),
    supabase.from("sale_payments").select("*").eq("sale_id", id).order("id"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ])

  if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })

  const { data: cashier } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", sale.cashier_id)
    .maybeSingle()

  const html = renderReceiptHTML(
    {
      id: sale.id,
      created_at: sale.created_at,
      subtotal: Number(sale.subtotal),
      iva_total: Number(sale.iva_total),
      total: Number(sale.total),
      cashier_name: cashier?.full_name ?? null,
      items: (items ?? []).map((it) => ({
        product_name: it.product_name,
        quantity: Number(it.quantity),
        unit: it.unit,
        unit_price: Number(it.unit_price),
        subtotal: Number(it.subtotal),
        iva_rate: Number(it.iva_rate),
      })),
      payments: (payments ?? []).map((p) => ({
        method: p.method,
        amount: Number(p.amount),
        reference: p.reference,
      })),
    },
    {
      store_name: settings?.store_name ?? STORE_NAME,
      address: settings?.address ?? null,
      cuit: settings?.cuit ?? null,
      receipt_footer: settings?.receipt_footer ?? null,
    },
  )

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}
