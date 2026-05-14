import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  sessionId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().positive(),
        unit_price: z.number().nonnegative(),
        iva_rate: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1),
  payments: z
    .array(
      z.object({
        method: z.enum(["efectivo", "debito", "credito", "transferencia", "mercadopago", "otro"]),
        amount: z.number().positive(),
        reference: z.string().optional(),
      }),
    )
    .min(1),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const { sessionId, items, payments } = parsed.data

  const { data, error } = await supabase.rpc("create_sale", {
    p_cashier_id: user.id,
    p_cash_session_id: sessionId,
    p_items: items as never,
    p_payments: payments as never,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ saleId: data })
}
