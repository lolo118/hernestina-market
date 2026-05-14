import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold">No encontrado</h1>
        <p className="text-muted-foreground">La página solicitada no existe.</p>
        <Button asChild>
          <Link href="/dashboard">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
