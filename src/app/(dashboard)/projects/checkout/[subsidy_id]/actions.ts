"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClientWithAuth } from "@/lib/supabase/server"

export type CheckoutSubsidy = {
  id: string
  name: string
  fixed_success_fee_rate: number | null
}

export type CheckoutClient = { id: string; name: string }

export async function getClientsForCheckout(): Promise<{
  data: CheckoutClient[]
  error: string | null
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { data: [], error: "Supabase not configured." }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as CheckoutClient[], error: null }
}

export async function getSubsidyForCheckout(
  subsidyId: string
): Promise<{ data: CheckoutSubsidy | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { data: null, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from("subsidies")
    .select("id, name, fixed_success_fee_rate")
    .eq("id", subsidyId)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as CheckoutSubsidy, error: null }
}

export async function createProject(
  subsidyId: string,
  clientId: string
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const supabase = await createServerClientWithAuth()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "ログインしてください。" }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      subsidy_id: subsidyId,
      client_id: clientId,
      tax_accountant_id: user.id,
      status: "matching",
      agreed_to_terms_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, projectId: data!.id }
}
