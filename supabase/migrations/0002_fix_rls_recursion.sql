-- =========================================================
-- Fix RLS infinite-recursion on profiles.
-- The helper functions is_superuser() / is_active_user() were defined without
-- SECURITY DEFINER, so when an RLS policy on `profiles` (or any table whose
-- policy calls one of them) ran, the helper itself triggered the policy,
-- which called the helper again → "stack depth limit exceeded".
--
-- Re-declaring them as SECURITY DEFINER makes them run as the function owner
-- and bypass RLS on their internal lookups.
-- =========================================================

create or replace function public.is_superuser() returns boolean
  language sql stable security definer set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superuser' and active
  );
$$;

create or replace function public.is_active_user() returns boolean
  language sql stable security definer set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
  );
$$;
