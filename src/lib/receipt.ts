import { format } from "date-fns"
import { es } from "date-fns/locale"
import { formatARS, formatQuantity } from "@/lib/money"
import { paymentMethodLabel, unitAbbrev } from "@/lib/constants"

export type ReceiptSale = {
  id: number
  created_at: string
  subtotal: number
  iva_total: number
  total: number
  cashier_name?: string | null
  items: Array<{
    product_name: string
    quantity: number
    unit: string
    unit_price: number
    subtotal: number
    iva_rate: number
  }>
  payments: Array<{
    method: string
    amount: number
    reference?: string | null
  }>
}

export type ReceiptStore = {
  store_name: string
  address?: string | null
  cuit?: string | null
  receipt_footer?: string | null
}

export function renderReceiptHTML(sale: ReceiptSale, store: ReceiptStore): string {
  const dateStr = format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })
  const totalPaid = sale.payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const change = totalPaid - sale.total

  const itemsHTML = sale.items
    .map(
      (it) => `
      <tr>
        <td>${escape(it.product_name)}</td>
        <td class="r">${formatQuantity(it.quantity, it.unit)} ${unitAbbrev(it.unit)}</td>
        <td class="r">${formatARS(it.unit_price)}</td>
        <td class="r">${formatARS(it.subtotal)}</td>
      </tr>`,
    )
    .join("")

  const paymentsHTML = sale.payments
    .map(
      (p) => `
      <tr>
        <td>${escape(paymentMethodLabel(p.method))}${p.reference ? ` <span class="muted">(${escape(p.reference)})</span>` : ""}</td>
        <td class="r">${formatARS(p.amount)}</td>
      </tr>`,
    )
    .join("")

  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8" />
<title>Ticket #${sale.id} — ${escape(store.store_name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #111; max-width: 320px; margin: 0 auto; padding: 12px; }
  h1 { font-size: 16px; margin: 0; text-align: center; }
  .muted { color: #555; }
  .center { text-align: center; }
  .r { text-align: right; }
  .l { text-align: left; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 2px 0; vertical-align: top; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
  .totals td { padding: 2px 0; }
  .grand { font-weight: 700; font-size: 14px; }
  .footer { margin-top: 8px; text-align: center; font-size: 11px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <h1>${escape(store.store_name)}</h1>
  ${store.address ? `<div class="center muted">${escape(store.address)}</div>` : ""}
  ${store.cuit ? `<div class="center muted">CUIT ${escape(store.cuit)}</div>` : ""}
  <hr />
  <div>Ticket N°: <strong>#${sale.id}</strong></div>
  <div>Fecha: ${dateStr}</div>
  ${sale.cashier_name ? `<div>Cajero: ${escape(sale.cashier_name)}</div>` : ""}
  <hr />
  <table>
    <thead>
      <tr><th class="l">Producto</th><th class="r">Cant.</th><th class="r">P. Unit.</th><th class="r">Subtotal</th></tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>
  <hr />
  <table class="totals">
    <tr><td>Subtotal (sin IVA)</td><td class="r">${formatARS(sale.subtotal)}</td></tr>
    <tr><td>IVA</td><td class="r">${formatARS(sale.iva_total)}</td></tr>
    <tr class="grand"><td>TOTAL</td><td class="r">${formatARS(sale.total)}</td></tr>
  </table>
  <hr />
  <table>
    <thead><tr><th class="l">Pago</th><th class="r">Monto</th></tr></thead>
    <tbody>${paymentsHTML}</tbody>
  </table>
  ${change > 0.0001 ? `<div class="r" style="margin-top:4px"><strong>Vuelto: ${formatARS(change)}</strong></div>` : ""}
  <hr />
  <div class="footer">${escape(store.receipt_footer ?? "¡Gracias por su compra!")}</div>
  <div class="no-print" style="margin-top:12px;text-align:center;">
    <button onclick="window.print()">Imprimir</button>
    <button onclick="window.close()">Cerrar</button>
  </div>
  <script>
    if (window.location.search.includes('autoprint')) {
      window.addEventListener('load', () => setTimeout(() => window.print(), 200));
    }
  </script>
</body>
</html>`
}

function escape(value: string | null | undefined): string {
  if (value === null || value === undefined) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
