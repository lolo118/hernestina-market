export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Hernestina"

export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "otro", label: "Otro" },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"]

export const UNITS = [
  { value: "un", label: "Unidad" },
  { value: "kg", label: "Kilogramo" },
  { value: "atado", label: "Atado" },
  { value: "docena", label: "Docena" },
  { value: "bandeja", label: "Bandeja" },
  { value: "litro", label: "Litro" },
  { value: "otro", label: "Otro" },
] as const

export type Unit = (typeof UNITS)[number]["value"]

export const WEIGHED_UNITS: Unit[] = ["kg", "litro"]

export const SECTIONS = [
  { code: "verduleria", label: "Verdulería" },
  { code: "fiambreria", label: "Fiambrería" },
  { code: "almacen", label: "Almacén" },
] as const

export const STOCK_MOVEMENT_TYPES = [
  { value: "entry", label: "Ingreso" },
  { value: "adjustment", label: "Ajuste" },
  { value: "loss", label: "Pérdida" },
  { value: "sale", label: "Venta" },
  { value: "void", label: "Anulación" },
] as const

export const SALE_STATUS_LABELS: Record<string, string> = {
  completed: "Completada",
  voided: "Anulada",
}

export const ROLE_LABELS: Record<string, string> = {
  superuser: "Superusuario",
  cashier: "Cajero",
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method
}

export function unitLabel(unit: string): string {
  return UNITS.find((u) => u.value === unit)?.label ?? unit
}

export function unitAbbrev(unit: string): string {
  switch (unit) {
    case "kg":
      return "kg"
    case "un":
      return "un."
    case "litro":
      return "L"
    case "atado":
      return "atado"
    case "docena":
      return "doc."
    case "bandeja":
      return "bandeja"
    default:
      return ""
  }
}
