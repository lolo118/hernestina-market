import type { Metadata } from "next"
import { LoginForm } from "./login-form"
import { STORE_NAME } from "@/lib/constants"

export const metadata: Metadata = { title: `Ingresar — ${STORE_NAME}` }

type SearchParams = Promise<{ redirectTo?: string; error?: string }>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { redirectTo, error } = await searchParams
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{STORE_NAME}</h1>
          <p className="text-sm text-muted-foreground">Sistema de Caja y Stock</p>
        </div>
        <LoginForm redirectTo={redirectTo ?? "/dashboard"} initialError={errorMessage(error)} />
      </div>
    </div>
  )
}

function errorMessage(code?: string): string | undefined {
  switch (code) {
    case "inactive":
      return "Tu cuenta está inactiva. Contactá al administrador."
    case "forbidden":
      return "No tenés permisos para acceder a esa sección."
    default:
      return undefined
  }
}
