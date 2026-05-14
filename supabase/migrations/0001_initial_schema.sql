-- =========================================================
-- HERNESTINA MARKET — INITIAL SCHEMA
-- =========================================================

-- Required extension
create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('superuser','cashier')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- sections ----------
create table public.sections (
  id smallserial primary key,
  code text unique not null,
  name text not null,
  default_iva_rate numeric(5,2) not null default 21.00
);
insert into public.sections (code, name, default_iva_rate) values
  ('verduleria','Verdulería',10.50),
  ('fiambreria','Fiambrería',21.00),
  ('almacen','Almacén',21.00);

-- ---------- settings (single row) ----------
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Hernestina',
  address text,
  cuit text,
  receipt_footer text default '¡Gracias por su compra!',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- ---------- products ----------
create table public.products (
  id bigserial primary key,
  section_id smallint not null references public.sections(id),
  name text not null,
  description text,
  barcode text unique,
  sku text unique,
  unit text not null check (unit in ('kg','un','atado','docena','bandeja','litro','otro')),
  cost numeric(12,2) not null default 0,
  price numeric(12,2) not null,                -- IVA INCLUDED
  iva_rate numeric(5,2) not null default 21.00,
  stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 0,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products (section_id);
create index on public.products (barcode);
create index on public.products (active);
create index on public.products (lower(name));

-- ---------- cash_sessions ----------
create table public.cash_sessions (
  id bigserial primary key,
  cashier_id uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_cash numeric(12,2) not null default 0,
  expected_cash numeric(12,2),
  counted_cash numeric(12,2),
  difference numeric(12,2),
  notes text,
  status text not null default 'open' check (status in ('open','closed'))
);
create index on public.cash_sessions (cashier_id, status);
create unique index one_open_session_per_cashier
  on public.cash_sessions (cashier_id)
  where status = 'open';

-- ---------- sales ----------
create table public.sales (
  id bigserial primary key,
  cashier_id uuid not null references public.profiles(id),
  cash_session_id bigint references public.cash_sessions(id),
  subtotal numeric(12,2) not null,            -- without IVA
  iva_total numeric(12,2) not null,
  total numeric(12,2) not null,               -- IVA included
  status text not null default 'completed' check (status in ('completed','voided')),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text,
  created_at timestamptz not null default now()
);
create index on public.sales (cashier_id);
create index on public.sales (created_at);
create index on public.sales (cash_session_id);
create index on public.sales (status);

-- ---------- sale_items ----------
create table public.sale_items (
  id bigserial primary key,
  sale_id bigint not null references public.sales(id) on delete cascade,
  product_id bigint not null references public.products(id),
  product_name text not null,                 -- snapshot at sale time
  quantity numeric(12,3) not null,
  unit text not null,
  unit_price numeric(12,2) not null,          -- IVA included, snapshot
  iva_rate numeric(5,2) not null,
  subtotal numeric(12,2) not null             -- quantity * unit_price (IVA included)
);
create index on public.sale_items (sale_id);
create index on public.sale_items (product_id);

-- ---------- sale_payments (one sale can have multiple payment methods) ----------
create table public.sale_payments (
  id bigserial primary key,
  sale_id bigint not null references public.sales(id) on delete cascade,
  method text not null check (method in ('efectivo','debito','credito','transferencia','mercadopago','otro')),
  amount numeric(12,2) not null,
  reference text,                             -- card last 4, tx id, etc.
  created_at timestamptz not null default now()
);
create index on public.sale_payments (sale_id);
create index on public.sale_payments (method);

-- ---------- stock_movements ----------
create table public.stock_movements (
  id bigserial primary key,
  product_id bigint not null references public.products(id),
  type text not null check (type in ('entry','adjustment','sale','void','loss')),
  quantity numeric(12,3) not null,            -- signed: + = in, - = out
  unit_cost numeric(12,2),
  reason text,
  reference_id bigint,                        -- sale id when type='sale'/'void'
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index on public.stock_movements (product_id, created_at desc);
create index on public.stock_movements (user_id);
create index on public.stock_movements (type);

-- ---------- audit_log ----------
create table public.audit_log (
  id bigserial primary key,
  user_id uuid references public.profiles(id),
  action text not null,                       -- INSERT/UPDATE/DELETE/LOGIN/LOGOUT/VOID_SALE/CLOSE_SESSION ...
  entity text not null,                       -- table name or domain entity
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (user_id);
create index on public.audit_log (created_at desc);
create index on public.audit_log (entity, entity_id);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- updated_at on products
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- Generic audit trigger
create or replace function public.audit_trigger() returns trigger language plpgsql as $$
declare
  v_user uuid;
begin
  v_user := auth.uid();
  if (TG_OP = 'INSERT') then
    insert into public.audit_log (user_id, action, entity, entity_id, new_values)
    values (v_user, 'INSERT', TG_TABLE_NAME, new.id::text, to_jsonb(new));
    return new;
  elsif (TG_OP = 'UPDATE') then
    insert into public.audit_log (user_id, action, entity, entity_id, old_values, new_values)
    values (v_user, 'UPDATE', TG_TABLE_NAME, new.id::text, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (TG_OP = 'DELETE') then
    insert into public.audit_log (user_id, action, entity, entity_id, old_values)
    values (v_user, 'DELETE', TG_TABLE_NAME, old.id::text, to_jsonb(old));
    return old;
  end if;
  return null;
end $$;

create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function public.audit_trigger();

create trigger audit_sales
  after insert or update or delete on public.sales
  for each row execute function public.audit_trigger();

create trigger audit_stock_movements
  after insert on public.stock_movements
  for each row execute function public.audit_trigger();

create trigger audit_cash_sessions
  after insert or update on public.cash_sessions
  for each row execute function public.audit_trigger();

create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();

create trigger audit_settings
  after update on public.settings
  for each row execute function public.audit_trigger();

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

create or replace function public.is_superuser() returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'superuser' and active);
$$;

create or replace function public.is_active_user() returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

-- =========================================================
-- ATOMIC SALE FUNCTION
-- =========================================================
-- Creates sale + items + payments + stock_movements + updates product.stock
-- in a single transaction. Validates stock and that payments sum to total.
create or replace function public.create_sale(
  p_cashier_id uuid,
  p_cash_session_id bigint,
  p_items jsonb,        -- [{product_id, quantity, unit_price, iva_rate}]
  p_payments jsonb      -- [{method, amount, reference}]
) returns bigint language plpgsql security definer as $$
declare
  v_sale_id bigint;
  v_subtotal numeric(12,2) := 0;
  v_iva numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_pay_sum numeric(12,2) := 0;
  v_item jsonb;
  v_payment jsonb;
  v_product record;
  v_qty numeric(12,3);
  v_price numeric(12,2);
  v_iva_rate numeric(5,2);
  v_line_total numeric(12,2);
  v_line_iva numeric(12,2);
  v_line_subtotal numeric(12,2);
begin
  if p_cashier_id is null then
    raise exception 'Cajero requerido';
  end if;
  if p_cash_session_id is null then
    raise exception 'Caja cerrada — debe abrir una caja antes de vender';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  -- Pre-pass: compute totals & validate stock (lock products)
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products
      where id = (v_item->>'product_id')::bigint and active = true for update;
    if not found then
      raise exception 'Producto inexistente o inactivo (id=%)', v_item->>'product_id';
    end if;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := (v_item->>'unit_price')::numeric;
    v_iva_rate := coalesce((v_item->>'iva_rate')::numeric, v_product.iva_rate);
    if v_qty <= 0 then
      raise exception 'Cantidad inválida para %', v_product.name;
    end if;
    if v_product.stock < v_qty then
      raise exception 'Stock insuficiente para % (disponible: %, solicitado: %)',
        v_product.name, v_product.stock, v_qty;
    end if;
    v_line_total := round(v_qty * v_price, 2);                            -- IVA included
    v_line_iva := round(v_line_total - (v_line_total / (1 + v_iva_rate/100)), 2);
    v_line_subtotal := v_line_total - v_line_iva;
    v_total := v_total + v_line_total;
    v_iva := v_iva + v_line_iva;
    v_subtotal := v_subtotal + v_line_subtotal;
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payments) loop
    v_pay_sum := v_pay_sum + (v_payment->>'amount')::numeric;
  end loop;

  if round(v_pay_sum, 2) < round(v_total, 2) then
    raise exception 'Los pagos (%) no alcanzan el total (%)', v_pay_sum, v_total;
  end if;

  -- Create sale
  insert into public.sales (cashier_id, cash_session_id, subtotal, iva_total, total)
    values (p_cashier_id, p_cash_session_id, v_subtotal, v_iva, v_total)
    returning id into v_sale_id;

  -- Insert items, decrement stock, log movements
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = (v_item->>'product_id')::bigint;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := (v_item->>'unit_price')::numeric;
    v_iva_rate := coalesce((v_item->>'iva_rate')::numeric, v_product.iva_rate);
    v_line_total := round(v_qty * v_price, 2);

    insert into public.sale_items (sale_id, product_id, product_name, quantity, unit, unit_price, iva_rate, subtotal)
      values (v_sale_id, v_product.id, v_product.name, v_qty, v_product.unit, v_price, v_iva_rate, v_line_total);

    update public.products set stock = stock - v_qty where id = v_product.id;

    insert into public.stock_movements (product_id, type, quantity, reason, reference_id, user_id)
      values (v_product.id, 'sale', -v_qty, 'Venta #' || v_sale_id, v_sale_id, p_cashier_id);
  end loop;

  -- Insert payments
  for v_payment in select * from jsonb_array_elements(p_payments) loop
    insert into public.sale_payments (sale_id, method, amount, reference)
      values (v_sale_id, v_payment->>'method', (v_payment->>'amount')::numeric, v_payment->>'reference');
  end loop;

  return v_sale_id;
end $$;

-- =========================================================
-- ATOMIC STOCK ENTRY FUNCTION
-- =========================================================
create or replace function public.register_stock_entry(
  p_product_id bigint,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_update_cost boolean default false,
  p_type text default 'entry'
) returns bigint language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_movement_id bigint;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;
  if not public.is_superuser() then
    raise exception 'Solo el superusuario puede registrar movimientos de stock';
  end if;
  if p_type not in ('entry','adjustment','loss') then
    raise exception 'Tipo de movimiento inválido';
  end if;

  insert into public.stock_movements (product_id, type, quantity, unit_cost, reason, user_id)
    values (p_product_id, p_type, p_quantity, p_unit_cost, p_reason, v_user)
    returning id into v_movement_id;

  update public.products
    set stock = stock + p_quantity,
        cost = case when p_update_cost and p_unit_cost is not null then p_unit_cost else cost end
    where id = p_product_id;

  return v_movement_id;
end $$;

-- =========================================================
-- ATOMIC VOID SALE FUNCTION
-- =========================================================
create or replace function public.void_sale(
  p_sale_id bigint,
  p_reason text
) returns void language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_item record;
  v_status text;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;
  if not public.is_superuser() then
    raise exception 'Solo el superusuario puede anular ventas';
  end if;

  select status into v_status from public.sales where id = p_sale_id for update;
  if v_status is null then
    raise exception 'Venta inexistente';
  end if;
  if v_status = 'voided' then
    raise exception 'La venta ya está anulada';
  end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
    insert into public.stock_movements (product_id, type, quantity, reason, reference_id, user_id)
      values (v_item.product_id, 'void', v_item.quantity, 'Anulación venta #' || p_sale_id, p_sale_id, v_user);
  end loop;

  update public.sales
    set status = 'voided', voided_at = now(), voided_by = v_user, void_reason = p_reason
    where id = p_sale_id;

  insert into public.audit_log (user_id, action, entity, entity_id, metadata)
    values (v_user, 'VOID_SALE', 'sales', p_sale_id::text, jsonb_build_object('reason', p_reason));
end $$;

-- =========================================================
-- CASH SESSION FUNCTIONS
-- =========================================================
create or replace function public.open_cash_session(
  p_opening_cash numeric
) returns bigint language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_session_id bigint;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  if not public.is_active_user() then raise exception 'Usuario inactivo'; end if;
  if exists (select 1 from public.cash_sessions where cashier_id = v_user and status = 'open') then
    raise exception 'Ya hay una caja abierta para este usuario';
  end if;
  insert into public.cash_sessions (cashier_id, opening_cash)
    values (v_user, p_opening_cash)
    returning id into v_session_id;
  return v_session_id;
end $$;

create or replace function public.close_cash_session(
  p_session_id bigint,
  p_counted_cash numeric,
  p_notes text default null
) returns void language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_session record;
  v_cash_in numeric(12,2);
  v_expected numeric(12,2);
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  select * into v_session from public.cash_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception 'Sesión inexistente'; end if;
  if v_session.cashier_id <> v_user and not public.is_superuser() then
    raise exception 'No autorizado';
  end if;
  if v_session.status = 'closed' then raise exception 'Sesión ya cerrada'; end if;

  select coalesce(sum(sp.amount), 0) into v_cash_in
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id
    where s.cash_session_id = p_session_id
      and sp.method = 'efectivo'
      and s.status = 'completed';

  v_expected := coalesce(v_session.opening_cash, 0) + v_cash_in;

  update public.cash_sessions
    set status = 'closed',
        closed_at = now(),
        counted_cash = p_counted_cash,
        expected_cash = v_expected,
        difference = p_counted_cash - v_expected,
        notes = p_notes
    where id = p_session_id;

  insert into public.audit_log (user_id, action, entity, entity_id, metadata)
    values (v_user, 'CLOSE_SESSION', 'cash_sessions', p_session_id::text,
            jsonb_build_object('expected', v_expected, 'counted', p_counted_cash, 'difference', p_counted_cash - v_expected));
end $$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.stock_movements enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_superuser());
create policy profiles_super_all on public.profiles for all using (public.is_superuser()) with check (public.is_superuser());

-- sections
create policy sections_read on public.sections for select using (public.is_active_user());
create policy sections_super_write on public.sections for all using (public.is_superuser()) with check (public.is_superuser());

-- settings
create policy settings_read on public.settings for select using (public.is_active_user());
create policy settings_super_write on public.settings for all using (public.is_superuser()) with check (public.is_superuser());

-- products
create policy products_read on public.products for select using (public.is_active_user());
create policy products_super_write on public.products for all using (public.is_superuser()) with check (public.is_superuser());

-- sales — selects only; mutations go through SECURITY DEFINER functions
create policy sales_select on public.sales for select using (cashier_id = auth.uid() or public.is_superuser());
create policy sale_items_select on public.sale_items for select using (
  exists (select 1 from public.sales s where s.id = sale_id and (s.cashier_id = auth.uid() or public.is_superuser()))
);
create policy sale_payments_select on public.sale_payments for select using (
  exists (select 1 from public.sales s where s.id = sale_id and (s.cashier_id = auth.uid() or public.is_superuser()))
);

-- stock_movements
create policy stock_mov_select on public.stock_movements for select using (user_id = auth.uid() or public.is_superuser());

-- cash_sessions
create policy cash_sessions_select on public.cash_sessions for select
  using (cashier_id = auth.uid() or public.is_superuser());

-- audit_log
create policy audit_super_read on public.audit_log for select using (public.is_superuser());

-- =========================================================
-- VIEWS
-- =========================================================
create or replace view public.v_low_stock as
  select p.id, p.name, p.stock, p.min_stock, s.name as section_name
  from public.products p
  join public.sections s on s.id = p.section_id
  where p.active and p.stock <= p.min_stock;

grant select on public.v_low_stock to authenticated;

-- =========================================================
-- SUPERUSER BOOTSTRAP NOTE
-- =========================================================
-- After running this migration:
-- 1) Create your first user in Supabase Dashboard → Authentication → Users.
-- 2) Run this SQL (replace UUID and email with the values shown there):
--
--    insert into public.profiles (id, full_name, role)
--    values ('<auth-user-uuid>', 'Nombre del Superusuario', 'superuser');
--
-- 3) Repeat with role='cashier' for each cashier you want to add.
