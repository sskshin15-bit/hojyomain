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

const PAGE_SIZE = 100

export type FetchSubsidiesOptions = {
  limit?: number
  start?: number
}

export async function fetchSubsidiesByKeyword(
  keyword: string,
  options?: FetchSubsidiesOptions
): Promise<JgrantsSubsidy[]> {
  const base = (process.env.JGRANTS_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, "")
  const params = new URLSearchParams({
    keyword,
    sort: "created_date",
    order: "DESC",
    acceptance: "1",
  })
  if (options?.limit != null) params.set("limit", String(options.limit))
  if (options?.start != null) params.set("start", String(options.start))
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

/**
 * 全件取得（ページネーション + 1リクエストごとに1秒スリープでRate Limit回避）
 */
export async function fetchAllSubsidiesFromJgrants(): Promise<JgrantsSubsidy[]> {
  const seen = new Set<string>()
  const all: JgrantsSubsidy[] = []
  let start = 0
  for (;;) {
    await new Promise((r) => setTimeout(r, 1000))
    const page = await fetchSubsidiesByKeyword("補助", { limit: PAGE_SIZE, start })
    for (const s of page) {
      if (s.id && !seen.has(String(s.id))) {
        seen.add(String(s.id))
        all.push(s)
      }
    }
    if (page.length < PAGE_SIZE) break
    start += PAGE_SIZE
    await new Promise((r) => setTimeout(r, 1000))
  }
  return all
}

/** 経済産業省関連の補助金を複数キーワードで取得（重複排除済み） */
export async function fetchMetiSubsidiesFromJgrants(): Promise<JgrantsSubsidy[]> {
  const keywords = ["IT導入", "ものづくり", "小規模事業者", "経済産業", "生産性向上"]
  const seen = new Set<string>()
  const all: JgrantsSubsidy[] = []

  for (const kw of keywords) {
    try {
      const items = await fetchSubsidiesByKeyword(kw)
      for (const s of items) {
        if (s.id && !seen.has(String(s.id))) {
          seen.add(String(s.id))
          all.push(s)
        }
      }
      await new Promise((r) => setTimeout(r, 1200))
    } catch {
      /* skip failed keyword */
    }
  }

  return all
}
