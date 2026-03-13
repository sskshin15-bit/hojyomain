/**
 * jGrants API クライアント
 * 環境変数 JGRANTS_API_BASE_URL が未設定の場合は使用しない（POST body モードにフォールバック）
 */

const DEFAULT_BASE = "https://api.jgrants-portal.go.jp/exp/v1"

export type JgrantsSubsidy = {
  id: string
  name: string
  title?: string
  detail?: string
  subsidy_catch_phrase?: string
  front_subsidy_detail_page_url?: string
  acceptance_end_datetime?: string
  subsidy_max_limit?: number
  [key: string]: unknown
}

export type JgrantsListResponse = {
  metadata?: { resultset?: { count?: number } }
  result?: JgrantsSubsidy[]
}

export async function fetchAllSubsidiesFromJgrants(): Promise<JgrantsSubsidy[]> {
  const base = (process.env.JGRANTS_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, "")

  const params = new URLSearchParams({
    keyword: "補助",
    sort: "created_date",
    order: "DESC",
    acceptance: "1",
  })
  const url = `${base}/public/subsidies?${params.toString()}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`jGrants fetch failed: ${msg}. URLの確認か、JGRANTS_API_BASE_URL を変えて試してください。`)
  }
  if (!res.ok) {
    throw new Error(`jGrants API error: ${res.status} ${res.statusText} (${url})`)
  }
  const json = (await res.json()) as JgrantsListResponse
  return json.result ?? []
}
