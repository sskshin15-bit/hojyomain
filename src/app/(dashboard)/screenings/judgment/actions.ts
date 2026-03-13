"use server"

import { createClient } from "@supabase/supabase-js"
import type { JudgmentRecord } from "./types"

/**
 * 判定結果・回答履歴をSupabaseの judgments テーブルに保存するモック／実装
 * テーブルが存在しない場合はコンソールに出力のみ
 */
export async function saveJudgmentMock(record: JudgmentRecord): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn("[JudgmentEngine] Supabase not configured. Mock save:", JSON.stringify(record, null, 2))
    return { ok: true }
  }

  try {
    const supabase = createClient(url, anonKey)
    const { error } = await supabase.from("judgments").insert({
      subsidy_id: record.subsidy_id,
      subsidy_name: record.subsidy_name,
      status: record.status,
      message: record.message,
      todo_list: record.todo_list,
      answers: record.answers,
      client_id: record.client_id ?? null,
    })

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        console.warn("[JudgmentEngine] judgments table not found. Run migration. Mock save:", record)
        return { ok: true }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー"
    console.warn("[JudgmentEngine] Save failed:", msg, "Record:", record)
    return { ok: false, error: msg }
  }
}
