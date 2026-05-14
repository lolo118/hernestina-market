import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, parseISO } from "date-fns"

export function parseDateRange(searchParams: Record<string, string | string[] | undefined>) {
  const fromStr = typeof searchParams.from === "string" ? searchParams.from : null
  const toStr = typeof searchParams.to === "string" ? searchParams.to : null
  const preset = typeof searchParams.preset === "string" ? searchParams.preset : null

  let from: Date
  let to: Date
  const today = new Date()

  if (fromStr && toStr) {
    from = startOfDay(parseISO(fromStr))
    to = endOfDay(parseISO(toStr))
  } else {
    switch (preset) {
      case "month":
        from = startOfMonth(today)
        to = endOfMonth(today)
        break
      case "7d":
        from = startOfDay(subDays(today, 6))
        to = endOfDay(today)
        break
      case "30d":
        from = startOfDay(subDays(today, 29))
        to = endOfDay(today)
        break
      case "today":
      default:
        from = startOfDay(today)
        to = endOfDay(today)
    }
  }
  return { from, to, fromISO: from.toISOString(), toISO: to.toISOString() }
}

export function formatDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
