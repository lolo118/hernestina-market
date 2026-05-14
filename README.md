# Hernestina Market — POS & Stock

Point-of-Sale and inventory management web app for **Hernestina**, a market in
Santiago del Estero, Argentina. Three sections (Verdulería, Fiambrería,
Almacén), barcode-driven checkout, multi-payment splits, IVA breakdown, cash
sessions, audit log, and superuser-only reports.

The UI is in **Spanish (es-AR)**. Source, comments, and commits are in English.

## Tech stack

- **Next.js 16** (App Router, React 19, Turbopack) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** components
- **Supabase** (Postgres + Auth + Row Level Security)
- **react-hook-form** + **zod**
- **sonner** for toasts
- **date-fns** with Spanish locale
- **Netlify** hosting via `@netlify/plugin-nextjs`

## Local setup

```bash
git clone https://github.com/<your-account>/hernestina-market.git
cd hernestina-market
npm install
cp .env.local.example .env.local   # then fill in the Supabase values
npm run dev
```

App runs at <http://localhost:3000>. Sign in with the email/password you set up
in Supabase (see "First superuser" below).

## Environment variables

Fill `.env.local` with:

| Variable                          | Where to find it                                                       |
| --------------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase Dashboard → Settings → API → "Project URL"                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase Dashboard → Settings → API → "anon public" key                |
| `SUPABASE_SERVICE_ROLE_KEY`       | Same screen → "service_role" key (SERVER ONLY — never expose to browser) |
| `NEXT_PUBLIC_STORE_NAME`          | Display name. Defaults to `Hernestina`.                                |

The service-role key is only imported in server-side files (`src/lib/supabase/server.ts`,
server actions, route handlers). It must **never** be referenced in a client component.

## Database setup

1. Create a new Supabase project.
2. In the dashboard, open **SQL editor** and paste the contents of
   [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).
   Click **Run**. This creates tables, RLS policies, triggers, and helper
   functions (`create_sale`, `register_stock_entry`, `void_sale`,
   `open_cash_session`, `close_cash_session`).
3. Verify the policies are enabled in **Authentication → Policies**.

## First superuser (bootstrap)

Supabase Auth users don't automatically get a `profiles` row. To create your
first superuser:

1. Open **Authentication → Users → "Add user"**, set an email and password.
2. Copy the new user's UUID.
3. Run this SQL in **SQL editor**:

   ```sql
   insert into public.profiles (id, full_name, role)
   values ('<paste-the-uuid>', 'Tu Nombre', 'superuser');
   ```

4. Sign in at `/login`. From the **Usuarios** page you can now create the two
   cashier accounts from inside the app.

## Deploying to Netlify

1. Push the repo to GitHub (the build expects a Git remote).
2. In Netlify, click **Add new site → Import from Git** and pick the repo.
   Netlify auto-detects Next.js. Keep the defaults.
3. Set the same four environment variables under **Site settings → Environment
   variables** before the first build.
4. Click **Deploy site**. The Next.js Runtime plugin is already configured via
   `netlify.toml`.

## Domain glossary (es-AR)

| Spanish                  | English equivalent                              |
| ------------------------ | ----------------------------------------------- |
| Sección                  | Section / department                            |
| Verdulería               | Produce (greengrocer)                           |
| Fiambrería               | Deli / cold cuts                                |
| Almacén                  | Groceries                                       |
| Caja                     | Checkout / POS / cash drawer                    |
| Cierre de caja           | Cash-session close                              |
| Apertura                 | Opening cash                                    |
| Vuelto                   | Change (money returned)                         |
| Cobrar                   | Charge / collect payment                        |
| Ticket / Venta           | Sale / receipt                                  |
| Anulación                | Void                                            |
| IVA                      | VAT (Argentine value-added tax)                 |
| Cajero                   | Cashier                                         |
| Stock mínimo             | Reorder level                                   |
| Auditoría                | Audit log                                       |

## Pricing & IVA convention

- `products.price` is **always** stored with IVA **included**, matching how
  prices are quoted to customers.
- `sale_items.subtotal` (per line) is `quantity * unit_price` (IVA included).
- `sales.subtotal` is the **base** (sin IVA), `sales.iva_total` is the IVA
  component, and `sales.total` is base + IVA.
- IVA is split out at sale time inside the `create_sale` Postgres function so
  the numbers in the receipt and reports are authoritative.

## Roles

- **Superusuario** — full access. Can manage products, register stock
  movements, void sales, create/disable users, see reports and audit log.
- **Cajero** — POS, opens/closes their own cash session, can view their own
  sales and the read-only product/stock screens.

Row Level Security enforces these boundaries at the database level; the UI
just mirrors them.

## Receipt printing

`/print/[saleId]` renders a thermal-style HTML receipt. Adding `?autoprint=1`
triggers `window.print()` on load. From the POS, the post-sale dialog opens
this URL in a new window.

## Project structure

```
src/
  app/
    (auth)/login            # public login
    (app)/                  # authenticated routes
      dashboard
      pos                   # the caja screen (mostly client-side)
      products
      stock
      sales
      cash-sessions
      reports               # superuser only
      audit                 # superuser only
      users                 # superuser only
      settings              # superuser only
    api/
      sales/route.ts        # POST → create_sale RPC
      sales/[id]/void       # POST → void_sale RPC
    print/[saleId]/route.ts # printable receipt
  components/
    layout/                 # sidebar, topbar
    pos/                    # POSGrid, Cart, WeightDialog, PaymentDialog, ReceiptDialog
    forms/                  # ProductForm, StockEntryForm, OpenSessionForm, CloseSessionForm
    sales/                  # void-sale button
    settings/, users/, reports/, ui/
  lib/
    supabase/               # browser, server, proxy helpers + types
    money.ts, csv.ts, receipt.ts, constants.ts, date-range.ts, auth.ts
  proxy.ts                  # session refresh (Next.js 16 renamed middleware → proxy)
supabase/
  migrations/0001_initial_schema.sql
```

## Known limitations / future work

- Offline-first POS (currently requires Supabase connectivity).
- Dedicated thermal-printer driver / ESC-POS escape codes — the printable HTML
  works on system printers but isn't byte-perfect for receipt printers.
- Integration with an electronic balance (scale) for the weight dialog.
- MercadoPago QR auto-confirmation via webhook.
- AFIP electronic invoicing (CAE).
- Multi-store / multi-tenant.
- Customer accounts and loyalty.
- More granular audit log diffing UI.
- Mobile-first POS layout (current layout is desktop-first).

## License

Internal project. All rights reserved.
