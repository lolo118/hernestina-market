"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient, createClient } from "@/lib/supabase/server"

export type ActionResult = { ok: true } | { error: string }

async function ensureSuperuser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile || profile.role !== "superuser" || !profile.active) {
    throw new Error("Solo el superusuario puede gestionar cuentas")
  }
}

export async function createUserAction(form: FormData): Promise<ActionResult> {
  await ensureSuperuser()
  const email = String(form.get("email") ?? "").trim()
  const password = String(form.get("password") ?? "")
  const full_name = String(form.get("full_name") ?? "").trim()
  const role = String(form.get("role") ?? "") as "superuser" | "cashier"
  if (!email || !password || !full_name || !["superuser", "cashier"].includes(role)) {
    return { error: "Datos incompletos o inválidos" }
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) return { error: error?.message ?? "No se pudo crear el usuario" }

  const supabase = await createClient()
  const { error: profileErr } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, full_name, role })

  if (profileErr) {
    await admin.auth.admin.deleteUser(data.user.id)
    return { error: profileErr.message }
  }

  revalidatePath("/users")
  return { ok: true }
}

export async function toggleUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  await ensureSuperuser()
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ active }).eq("id", userId)
  if (error) return { error: error.message }
  revalidatePath("/users")
  return { ok: true }
}

export async function sendPasswordResetAction(userId: string): Promise<ActionResult> {
  await ensureSuperuser()
  const admin = createAdminClient()
  const { data: user, error: getErr } = await admin.auth.admin.getUserById(userId)
  if (getErr || !user.user?.email) return { error: getErr?.message ?? "Usuario no encontrado" }
  const { error } = await admin.auth.resetPasswordForEmail(user.user.email)
  if (error) return { error: error.message }
  return { ok: true }
}
