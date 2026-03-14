"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClientWithAuth } from "@/lib/supabase/server"

export type ProjectDetail = {
  id: string
  subsidy_id: string
  client_id: string
  tax_accountant_id: string
  expert_id: string | null
  status: string
  subsidy_name: string
  client_name: string
  base_platform_fee_rate: number | null
  fixed_success_fee_rate: number | null
  grant_amount: number | null
  success_fee_amount: number | null
  platform_fee_amount: number | null
  is_paid: boolean
  expert_bidding_fee_rate: number | null
  current_user_role?: string
}

export type ExpertForMatch = {
  id: string
  bidding_fee_rate: number
  total_fee_rate: number
}

export async function getProjectWithContext(
  projectId: string
): Promise<{ data: ProjectDetail | null; error: string | null }> {
  const supabase = await createServerClientWithAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "ログインしてください。" }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { data: null, error: "Supabase not configured." }
  const client = createClient(url, key, { auth: { persistSession: false } })

  const { data: project, error: projErr } = await client
    .from("projects")
    .select(`
      id,
      subsidy_id,
      client_id,
      tax_accountant_id,
      expert_id,
      status,
      grant_amount,
      success_fee_amount,
      platform_fee_amount,
      is_paid
    `)
    .eq("id", projectId)
    .single()

  if (projErr || !project) return { data: null, error: projErr?.message ?? "Not found" }

  const [subRes, clientRes, expertRes, profileRes] = await Promise.all([
    client.from("subsidies").select("name, base_platform_fee_rate, fixed_success_fee_rate").eq("id", project.subsidy_id).single(),
    client.from("clients").select("name").eq("id", project.client_id).single(),
    project.expert_id ? client.from("profiles").select("bidding_fee_rate").eq("id", project.expert_id).single() : Promise.resolve({ data: null }),
    client.from("profiles").select("role").eq("id", user.id).single(),
  ])

  return {
    data: {
      ...project,
      subsidy_name: subRes.data?.name ?? "",
      client_name: clientRes.data?.name ?? "",
      base_platform_fee_rate: subRes.data?.base_platform_fee_rate ?? null,
      fixed_success_fee_rate: subRes.data?.fixed_success_fee_rate ?? null,
      expert_bidding_fee_rate: expertRes.data?.bidding_fee_rate != null ? Number(expertRes.data.bidding_fee_rate) : null,
      is_paid: project.is_paid ?? false,
      current_user_role: (profileRes.data as { role?: string })?.role ?? undefined,
    } as ProjectDetail,
    error: null,
  }
}

export async function getExpertsForMatching(projectId: string): Promise<{
  data: (ExpertForMatch & { display_name?: string })[]
  error: string | null
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { data: [], error: "Supabase not configured." }
  const client = createClient(url, key, { auth: { persistSession: false } })

  const { data: project, error: projErr } = await client
    .from("projects")
    .select("subsidy_id")
    .eq("id", projectId)
    .single()
  if (projErr || !project) return { data: [], error: projErr?.message ?? "Project not found" }

  const { data: subsidy } = await client
    .from("subsidies")
    .select("base_platform_fee_rate")
    .eq("id", project.subsidy_id)
    .single()

  const baseRate = Number(subsidy?.base_platform_fee_rate ?? 0)

  const { data: experts, error } = await client
    .from("profiles")
    .select("id, bidding_fee_rate")
    .eq("role", "expert")

  if (error) return { data: [], error: error.message }

  const withTotal = (experts ?? []).map((e) => ({
    id: e.id,
    bidding_fee_rate: Number(e.bidding_fee_rate ?? 0),
    total_fee_rate: baseRate + Number(e.bidding_fee_rate ?? 0),
    display_name: `専門家 ${(e.id as string).slice(0, 8)}`,
  }))

  withTotal.sort((a, b) => b.total_fee_rate - a.total_fee_rate)

  return { data: withTotal, error: null }
}

export async function assignExpert(
  projectId: string,
  expertId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClientWithAuth()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "ログインしてください。" }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false, error: "Supabase not configured." }

  const { data: project } = await createClient(url, key, { auth: { persistSession: false } })
    .from("projects")
    .select("tax_accountant_id, status")
    .eq("id", projectId)
    .single()

  if (!project) return { ok: false, error: "案件が見つかりません。" }
  if (project.tax_accountant_id !== user.id) return { ok: false, error: "この案件の依頼者ではありません。" }
  if (project.status !== "matching") return { ok: false, error: "この案件はマッチング中ではありません。" }

  const { error } = await supabase
    .from("projects")
    .update({ expert_id: expertId, status: "in_progress" })
    .eq("id", projectId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// --- Phase 4: 密室ワークスペース（チャット・ファイル） ---

export type ProjectMessage = {
  id: string
  project_id: string
  sender_id: string
  content: string
  created_at: string
  sender_name?: string
}

export type ProjectFile = {
  id: string
  project_id: string
  uploader_id: string
  file_url: string
  file_name: string
  created_at: string
  signed_url?: string
}

async function assertProjectMember(projectId: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createServerClientWithAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "ログインしてください。" }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false, error: "Supabase not configured." }
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { data: project } = await client.from("projects").select("tax_accountant_id, expert_id").eq("id", projectId).single()
  if (!project) return { ok: false, error: "案件が見つかりません。" }
  const isMember = project.tax_accountant_id === user.id || project.expert_id === user.id
  const { data: admin } = await client.from("profiles").select("role").eq("id", user.id).single()
  if (!isMember && admin?.role !== "admin") return { ok: false, error: "この案件にアクセスする権限がありません。" }
  return { ok: true, userId: user.id }
}

export async function getProjectMessages(projectId: string): Promise<{
  data: ProjectMessage[]
  error: string | null
}> {
  const member = await assertProjectMember(projectId)
  if (!member.ok) return { data: [], error: member.error }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { data: [], error: "Supabase not configured." }
  const supabase = await createServerClientWithAuth()
  const { data: rows, error } = await supabase
    .from("project_messages")
    .select("id, project_id, sender_id, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
  if (error) return { data: [], error: error.message }
  const names: Record<string, string> = {}
  ;(rows ?? []).forEach((r) => { if (!names[r.sender_id]) names[r.sender_id] = `ユーザー ${r.sender_id.slice(0, 8)}` })
  return {
    data: (rows ?? []).map((r) => ({ ...r, sender_name: names[r.sender_id] ?? r.sender_id })),
    error: null,
  }
}

export async function sendProjectMessage(projectId: string, content: string): Promise<{ ok: boolean; error?: string }> {
  const member = await assertProjectMember(projectId)
  if (!member.ok) return { ok: false, error: member.error }
  const supabase = await createServerClientWithAuth()
  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    sender_id: member.userId,
    content: content.trim(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getProjectFiles(projectId: string): Promise<{ data: ProjectFile[]; error: string | null }> {
  const member = await assertProjectMember(projectId)
  if (!member.ok) return { data: [], error: member.error }
  const supabase = await createServerClientWithAuth()
  const { data: rows, error } = await supabase
    .from("project_files")
    .select("id, project_id, uploader_id, file_url, file_name, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) return { data: [], error: error.message }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { data: rows ?? [], error: null }
  const storage = createClient(url, key, { auth: { persistSession: false } }).storage
  const withUrls = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data } = await storage.from("project-files").createSignedUrl(r.file_url, 3600)
      return { ...r, signed_url: data?.signedUrl ?? null }
    })
  )
  return { data: withUrls, error: null }
}

export async function uploadProjectFile(
  projectId: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const member = await assertProjectMember(projectId)
  if (!member.ok) return { ok: false, error: member.error }
  const file = formData.get("file") as File | null
  if (!file || !file.size) return { ok: false, error: "ファイルを選択してください。" }
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) return { ok: false, error: "ファイルサイズは10MB以内にしてください。" }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${projectId}/${crypto.randomUUID()}_${safeName}`

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false, error: "Supabase not configured." }
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error: uploadErr } = await client.storage.from("project-files").upload(path, file, { upsert: false })
  if (uploadErr) return { ok: false, error: uploadErr.message }
  const supabase = await createServerClientWithAuth()
  const { error: insertErr } = await supabase.from("project_files").insert({
    project_id: projectId,
    uploader_id: member.userId,
    file_url: path,
    file_name: file.name,
  })
  if (insertErr) return { ok: false, error: insertErr.message }
  return { ok: true }
}

// --- Phase 5: ステータス更新・決済計算 ---

export async function updateProjectStatus(
  projectId: string,
  newStatus: string,
  grantAmount?: number | null
): Promise<{ ok: boolean; error?: string }> {
  const member = await assertProjectMember(projectId)
  if (!member.ok) return { ok: false, error: member.error }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false, error: "Supabase not configured." }
  const client = createClient(url, key, { auth: { persistSession: false } })
  const supabase = await createServerClientWithAuth()

  const { data: project, error: fetchErr } = await client
    .from("projects")
    .select("status, subsidy_id, expert_id")
    .eq("id", projectId)
    .single()
  if (fetchErr || !project) return { ok: false, error: fetchErr?.message ?? "案件が見つかりません。" }

  const allowed: Record<string, string[]> = {
    matching: ["in_progress"],
    in_progress: ["applying", "canceled"],
    applying: ["adopted", "canceled"],
    adopted: ["completed", "canceled"],
    completed: [],
    canceled: [],
  }
  const next = allowed[project.status]
  if (!next?.includes(newStatus)) return { ok: false, error: `この状態から「${newStatus}」へは変更できません。` }

  if (newStatus === "adopted") {
    const amt = grantAmount != null ? Number(grantAmount) : NaN
    if (!(amt > 0)) return { ok: false, error: "採択金額を入力してください（1円以上）。" }

    const [subRes, expertRes] = await Promise.all([
      client.from("subsidies").select("fixed_success_fee_rate, base_platform_fee_rate").eq("id", project.subsidy_id).single(),
      project.expert_id ? client.from("profiles").select("bidding_fee_rate").eq("id", project.expert_id).single() : Promise.resolve({ data: null }),
    ])
    const fixedRate = Number(subRes.data?.fixed_success_fee_rate ?? 0)
    const baseRate = Number(subRes.data?.base_platform_fee_rate ?? 0)
    const biddingRate = expertRes.data?.bidding_fee_rate != null ? Number(expertRes.data.bidding_fee_rate) : 0
    const successFee = Math.floor(amt * fixedRate)
    const platformFee = Math.floor(successFee * (baseRate + biddingRate))

    const { error } = await supabase
      .from("projects")
      .update({
        status: newStatus,
        grant_amount: amt,
        success_fee_amount: successFee,
        platform_fee_amount: platformFee,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  const { error } = await supabase
    .from("projects")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", projectId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateProjectPaidStatus(
  projectId: string,
  isPaid: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClientWithAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "ログインしてください。" }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false, error: "Supabase not configured." }
  const { data: profile } = await createClient(url, key, { auth: { persistSession: false } })
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") return { ok: false, error: "管理者のみ操作可能です。" }

  const { error } = await supabase
    .from("projects")
    .update({ is_paid: isPaid, updated_at: new Date().toISOString() })
    .eq("id", projectId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
