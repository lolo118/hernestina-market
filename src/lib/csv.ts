function escape(value: unknown): string {
  if (value === null || value === undefined) return ""
  let s = String(value)
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes(";")) {
    s = '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function toCSV<T extends Record<string, unknown>>(rows: T[], headers?: Array<keyof T | { key: keyof T; label: string }>): string {
  if (rows.length === 0 && !headers) return ""
  const keys: Array<keyof T> =
    headers?.map((h) => (typeof h === "object" ? h.key : h)) ??
    (Object.keys(rows[0] ?? {}) as Array<keyof T>)
  const labels: string[] =
    headers?.map((h) => (typeof h === "object" ? h.label : String(h))) ??
    keys.map((k) => String(k))
  const headerLine = labels.map(escape).join(",")
  const body = rows.map((row) => keys.map((k) => escape(row[k])).join(",")).join("\n")
  // BOM so Excel detects UTF-8
  return "﻿" + headerLine + "\n" + body
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
