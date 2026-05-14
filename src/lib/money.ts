const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const NUMBER_AR = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatARS(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return ARS.format(0)
  const n = typeof value === "string" ? Number(value) : value
  if (Number.isNaN(n)) return ARS.format(0)
  return ARS.format(n)
}

export function formatNumber(value: number | string | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || value === "") return "0"
  const n = typeof value === "string" ? Number(value) : value
  if (Number.isNaN(n)) return "0"
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n)
}

export function formatQuantity(value: number | string | null | undefined, unit: string): string {
  const decimals = unit === "kg" || unit === "litro" ? 3 : 0
  return formatNumber(value, decimals)
}

export function parseARS(text: string): number {
  if (!text) return 0
  // Argentine notation: 1.234,56 → 1234.56
  const normalized = text.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  const n = Number(normalized)
  return Number.isNaN(n) ? 0 : n
}

/**
 * Given a total that already INCLUDES IVA, split it into base + iva amounts.
 * Rates are percentages: 21 means 21%.
 */
export function splitIVAFromTotal(totalIncludingIVA: number, ivaRate: number): { subtotal: number; iva: number } {
  const total = round2(totalIncludingIVA)
  const subtotal = round2(total / (1 + ivaRate / 100))
  const iva = round2(total - subtotal)
  return { subtotal, iva }
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

// Re-export to satisfy unused warnings if any
export { ARS as ARS_FORMATTER, NUMBER_AR as NUMBER_FORMATTER }
