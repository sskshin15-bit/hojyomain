/**
 * POST /api/knowledge/feedback
 * 人間の修正（HITL）を受信し、メタ学習で Critic プロンプトを更新
 */

import { NextResponse } from "next/server"
import { improveCriticPrompt } from "@/lib/knowledge/meta-learning"
import { getCriticPrompt, updateCriticPrompt } from "@/lib/knowledge/implementations/supabase-system-prompts"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const original = typeof body.original === "string" ? body.original : ""
    const corrected = typeof body.corrected === "string" ? body.corrected : ""

    if (!original.trim() || !corrected.trim()) {
      return NextResponse.json(
        { error: "original と corrected を両方指定してください" },
        { status: 400 }
      )
    }

    const current = await getCriticPrompt()
    if (!current) {
      return NextResponse.json(
        { error: "Critic プロンプトが登録されていません" },
        { status: 500 }
      )
    }

    const { improvedPrompt, changesSummary } = await improveCriticPrompt(
      original,
      corrected,
      current.prompt_text
    )

    await updateCriticPrompt(improvedPrompt, current.version)

    return NextResponse.json({
      success: true,
      version: current.version + 1,
      changes_summary: changesSummary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
