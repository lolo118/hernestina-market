import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireSuperuser } from "@/lib/auth"
import { SettingsForm } from "@/components/settings/settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  await requireSuperuser()
  const supabase = await createClient()
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle()
  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Configuración del comercio para los tickets.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Comercio</CardTitle></CardHeader>
        <CardContent>
          <SettingsForm initial={data ?? null} />
        </CardContent>
      </Card>
    </div>
  )
}
