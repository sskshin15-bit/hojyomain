"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClientWithAuth } from "@/lib/supabase/server"

export type ProjectListItem = {
  id: string
  status: string
  created_at: string
  subsidy_name: string
  client_name: string
}

export async function getProjectsList(): Promise<{
  data: ProjectListItem[]
  error: string | null
}> {
  const supabase = await createServerClientWithAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: "ログインしてください。" }

  const { data: rows, error } = await supabase
    .from("projects")
    .select("id, status, created_at, subsidy_id, client_id")
    .order("created_at", { ascending: false })

  if (error) return { data: [], error: error.message }
  if (!rows?.length) return { data: [], error: null }

  const subsidyIds = [...new Set(rows.map((r) => r.subsidy_id))]
  const clientIds = [...new Set(rows.map((r) => r.client_id))]
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { data: rows.map((r) => ({ ...r, subsidy_name: "", client_name: "" })) as ProjectListItem[], error: null }

  const client = createClient(url, key, { auth: { persistSession: false } })
  const [subsRes, clientRes] = await Promise.all([
    client.from("subsidies").select("id, name").in("id", subsidyIds),
    client.from("clients").select("id, name").in("id", clientIds),
  ])
  const subMap = Object.fromEntries((subsRes.data ?? []).map((s) => [s.id, s.name]))
  const clientMap = Object.fromEntries((clientRes.data ?? []).map((c) => [c.id, c.name]))

  return {
    data: rows.map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      subsidy_name: subMap[r.subsidy_id] ?? "",
      client_name: clientMap[r.client_id] ?? "",
    })),
    error: null,
  }
}
