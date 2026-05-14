import { notFound } from "next/navigation"
import { ProductForm } from "@/components/forms/product-form"
import { createClient } from "@/lib/supabase/server"
import { requireSuperuser } from "@/lib/auth"

type Params = Promise<{ id: string }>

export default async function EditProductPage({ params }: { params: Params }) {
  await requireSuperuser()
  const { id } = await params
  const supabase = await createClient()
  const [{ data: product }, { data: sections }] = await Promise.all([
    supabase.from("products").select("*").eq("id", Number(id)).maybeSingle(),
    supabase.from("sections").select("*").order("id"),
  ])
  if (!product || !sections) notFound()
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-semibold">Editar producto</h1>
      <ProductForm initial={product} sections={sections} />
    </div>
  )
}
