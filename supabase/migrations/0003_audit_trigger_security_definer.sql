-- =========================================================
-- Fix: audit_trigger must run as SECURITY DEFINER so it can write to audit_log
-- regardless of the caller's RLS privileges.
--
-- audit_log has only a SELECT policy (superuser-only) — no INSERT policy. Any
-- direct UPDATE/INSERT/DELETE done by a logged-in user (e.g. saving Ajustes,
-- editing a product) fires the audit trigger, which then tries to INSERT into
-- audit_log under the caller's role and is blocked → "new row violates row-
-- level security policy for table audit_log".
--
-- auth.uid() still returns the real caller's UUID inside a SECURITY DEFINER
-- function (it reads JWT claims, not current_user), so the audit log still
-- attributes changes to the actual user.
-- =========================================================

create or replace function public.audit_trigger() returns trigger
  language plpgsql security definer set search_path = public, auth
as $$
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
