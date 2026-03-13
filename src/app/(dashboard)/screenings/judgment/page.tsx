"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JudgmentEngine } from "./JudgmentEngine"
import { mockSubsidyData } from "./mockSubsidyData"
import { FileQuestion } from "lucide-react"

export default function JudgmentPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            補助金判定
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            選択した補助金について、1問ずつ回答すると受給要件の可否を判定します。
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Card className="border-slate-200 shadow-sm mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <FileQuestion className="h-5 w-5 text-slate-600" />
              {mockSubsidyData.subsidy_name}
            </CardTitle>
            <CardDescription className="text-slate-500">
              モックデータ駆動の判定フローです。回答に応じて次の質問や代替ルートへ進みます。
            </CardDescription>
          </CardHeader>
        </Card>
        <JudgmentEngine data={mockSubsidyData} />
      </div>
    </div>
  )
}
