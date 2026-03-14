"use server"

import { createClient } from "@supabase/supabase-js"

export type MinimumWageRow = {
  id: string
  prefecture: string
  hourly_wage: number
  effective_date: string
  created_at: string
  updated_at: string
}

/**
 * 指定都道府県の「現在有効な」最低賃金を取得。
 * effective_date が現在日時以前のもののうち、最も新しい1件を返す。
 */
export async function getCurrentMinimumWage(
  prefecture: string
): Promise<{ data: MinimumWageRow | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { data: null, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("minimum_wages")
    .select("id, prefecture, hourly_wage, effective_date, created_at, updated_at")
    .eq("prefecture", prefecture)
    .lte("effective_date", now)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: data as MinimumWageRow | null, error: null }
}
