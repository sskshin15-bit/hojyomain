"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Coins,
  Briefcase,
  ChevronDown,
  RefreshCw,
} from "lucide-react"

export default function ScreeningPage() {
  const [confirmed, setConfirmed] = useState(false)
  const [showResults, setShowResults] = useState(true) // Mocked as true to show results
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [invoiceRegistered, setInvoiceRegistered] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AI 5秒スクリーニング
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            顧問先の基本データを入力し、現状で申請可能な補助金を即座に判定します。
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Input Form */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Building2 className="h-5 w-5 text-slate-600" />
                顧問先データの入力
              </CardTitle>
              <CardDescription className="text-slate-500">
                基本情報を入力して補助金の適格性を判定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 企業名 */}
              <div className="space-y-2">
                <Label
                  htmlFor="company-name"
                  className="text-sm font-medium text-slate-700"
                >
                  企業名
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="company-name"
                    placeholder="株式会社〇〇"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    defaultValue="株式会社サンプルテック"
                  />
                </div>
              </div>

              {/* 業種 */}
              <div className="space-y-2">
                <Label
                  htmlFor="industry"
                  className="text-sm font-medium text-slate-700"
                >
                  業種
                </Label>
                <div className="relative">
                  <Select defaultValue="it">
                    <SelectTrigger className="w-full border-slate-200 focus:border-slate-400 focus:ring-slate-400">
                      <Briefcase className="mr-2 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="業種を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">IT・通信</SelectItem>
                      <SelectItem value="construction">建設業</SelectItem>
                      <SelectItem value="food">飲食業</SelectItem>
                      <SelectItem value="manufacturing">製造業</SelectItem>
                      <SelectItem value="retail">小売業</SelectItem>
                      <SelectItem value="service">サービス業</SelectItem>
                      <SelectItem value="medical">医療・福祉</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 従業員数 */}
              <div className="space-y-2">
                <Label
                  htmlFor="employees"
                  className="text-sm font-medium text-slate-700"
                >
                  従業員数
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="employees"
                    type="number"
                    placeholder="15"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    defaultValue="15"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    名
                  </span>
                </div>
              </div>

              {/* 資本金 */}
              <div className="space-y-2">
                <Label
                  htmlFor="capital"
                  className="text-sm font-medium text-slate-700"
                >
                  資本金
                </Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="capital"
                    type="number"
                    placeholder="500"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    defaultValue="500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    万円
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-800 h-12 text-base font-semibold shadow-sm"
                onClick={() => setShowResults(true)}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                AIで即時判定する（無料）
              </Button>
            </CardContent>
          </Card>

          {/* Right Column - Results */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-600" />
                判定結果・アクションプラン
              </CardTitle>
              <CardDescription className="text-slate-500">
                AIによる補助金マッチング結果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {showResults ? (
                <>
                  {/* Initial Result Section */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          マッチした補助金
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                          IT導入補助金 2024（通常枠）
                        </h3>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        簡易判定: 申請可能（マッチ度80%）
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-500">想定金額:</span>
                        <span className="text-lg font-bold text-slate-900">
                          約150万円
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Screening Section */}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setAdvancedOpen(!advancedOpen)}
                      className="flex w-full items-center justify-between p-4 text-left"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        さらに詳細な条件を追加して判定精度を上げる（任意）
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                          advancedOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {advancedOpen && (
                      <div className="border-t border-slate-100 p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* 賃上げ計画の有無 */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">
                              賃上げ計画の有無
                            </Label>
                            <Select defaultValue="">
                              <SelectTrigger className="h-9 text-sm border-slate-200">
                                <SelectValue placeholder="選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">あり</SelectItem>
                                <SelectItem value="no">なし</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 直近の決算状況 */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">
                              直近の決算状況
                            </Label>
                            <Select defaultValue="">
                              <SelectTrigger className="h-9 text-sm border-slate-200">
                                <SelectValue placeholder="選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="profit">営業黒字</SelectItem>
                                <SelectItem value="loss">赤字</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 創業からの年数 */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">
                              創業からの年数
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="3"
                                className="h-9 text-sm border-slate-200 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                年
                              </span>
                            </div>
                          </div>

                          {/* インボイス発行事業者 */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">
                              インボイス発行事業者
                            </Label>
                            <div className="flex h-9 items-center">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="invoice"
                                  checked={invoiceRegistered}
                                  onCheckedChange={(checked) =>
                                    setInvoiceRegistered(checked as boolean)
                                  }
                                />
                                <Label
                                  htmlFor="invoice"
                                  className="text-sm text-slate-600 cursor-pointer"
                                >
                                  登録済み
                                </Label>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recalculate Button */}
                        <Button
                          variant="outline"
                          className="mt-4 w-full h-9 text-sm border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          判定を再実行する
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Gap Analysis Warning */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          プロの視点
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-amber-700">
                          賃上げ計画を「あり」に設定し、要件を満たすと、上位枠（最大300万円）へアップグレード可能です。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hard Gate Checkbox */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirm"
                        checked={confirmed}
                        onCheckedChange={(checked) =>
                          setConfirmed(checked as boolean)
                        }
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="confirm"
                        className="text-sm leading-relaxed text-slate-700 cursor-pointer"
                      >
                        AIの判定結果および要件を税理士として最終確認しました
                      </Label>
                    </div>
                  </div>

                  {/* Final Action Button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!confirmed}
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    提案用ロードマップを出力（PDF/Web）
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-slate-100 p-4">
                    <Sparkles className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    左側のフォームに顧問先データを入力し、
                    <br />
                    「AIで即時判定する」をクリックしてください
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
