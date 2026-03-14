/**
 * POST /api/knowledge/query
 * 質問に対して Retrieval → Ensemble → Aggregator → Critic パイプラインを実行
 */

import { NextResponse } from "next/server"
import { runEnsemblePipeline } from "@/lib/knowledge/ensemble-pipeline"

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const query = typeof body.query === "string" ? body.query.trim() : ""
    const source = typeof body.source === "string" ? body.source.trim() : undefined

    if (!query) {
      return NextResponse.json(
        { error: "query を指定してください" },
        { status: 400 }
      )
    }

    const result = await runEnsemblePipeline({
      query,
      sourceFilter: source,
    })

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
