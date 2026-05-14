import { notFound } from "next/navigation"
import { ProductForm } from "@/components/forms/product-form"
import { createClient } from "@/lib/supabase/server"
import { requireSuperuser } from "@/lib/auth"

export default async function NewProductPage() {
  await requireSuperuser()
  const supabase = await createClient()
  const sections = await supabase.from("sections").select("*").order("id")
  if (!sections.data) notFound()
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      <ProductForm sections={sections.data} />
    </div>
  )
}
