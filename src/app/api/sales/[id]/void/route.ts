import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ id: string }>

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params
  const saleId = Number(id)
  if (!Number.isFinite(saleId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { reason?: string } | null
  const reason = (body?.reason ?? "").trim()
  if (!reason) return NextResponse.json({ error: "Motivo requerido" }, { status: 400 })

  const { error } = await supabase.rpc("void_sale", { p_sale_id: saleId, p_reason: reason })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
