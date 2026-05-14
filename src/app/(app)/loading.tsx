import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="p-12 flex items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin mr-2" />
      Cargando…
    </div>
  )
}
