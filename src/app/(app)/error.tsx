"use client"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Ocurrió un error</AlertTitle>
        <AlertDescription className="break-all">{error.message}</AlertDescription>
      </Alert>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => reset()}>Reintentar</Button>
      </div>
    </div>
  )
}
