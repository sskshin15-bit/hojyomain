"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ExternalLink,
  Plus,
  Copy,
  Check,
} from "lucide-react"

const trackingLinks = [
  {
    id: 1,
    name: "YouTube概要欄用",
    code: "YT80K_xyz",
    url: "https://hojokin-pro.jp/r/YT80K_xyz",
    clicks: 1240,
    conversions: 42,
  },
  {
    id: 2,
    name: "X(旧Twitter)プロフィール用",
    code: "X_PROMO",
    url: "https://hojokin-pro.jp/r/X_PROMO",
    clicks: 350,
    conversions: 8,
  },
]

export default function SettingsPage() {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleCopy = (id: number, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            事務所設定
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            アカウント情報、契約プラン、およびメディア・SNS用招待リンクの管理を行います。
          </p>
        </div>

        <div className="space-y-6">
          {/* Section 1: Basic Profile */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">
                税理士事務所の基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="office-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    事務所名
                  </Label>
                  <Input
                    id="office-name"
                    defaultValue="〇〇税理士事務所"
                    className="h-10 border-slate-200 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="representative"
                    className="text-sm font-medium text-slate-700"
                  >
                    代表税理士名
                  </Label>
                  <Input
                    id="representative"
                    defaultValue="〇〇 太郎"
                    className="h-10 border-slate-200 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="registration"
                    className="text-sm font-medium text-slate-700"
                  >
                    税理士登録番号
                  </Label>
                  <Input
                    id="registration"
                    defaultValue="第123456号"
                    className="h-10 border-slate-200 bg-white text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button className="h-9 bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
                  変更を保存
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Billing & Plan */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">
                現在の契約プラン
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-slate-900">
                      Premium Plan (年額払い)
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                      Premium
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-600">
                      有効 (次回ご請求日: 2027年3月13日)
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="h-9 border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  お支払い方法の管理 (Stripe Portal)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Media & Affiliate Links */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">
                パートナー招待リンク（特別割引）
              </CardTitle>
              <CardDescription className="mt-1.5 text-sm text-slate-500">
                YouTubeの概要欄やSNSに設置するための、専用のトラッキングURLを発行・管理します。このリンク経由の登録者は自動的に紹介報酬の対象となります。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        リンク名
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        URL
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        クリック数
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        コンバージョン
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackingLinks.map((link) => (
                      <TableRow
                        key={link.id}
                        className="hover:bg-slate-50/50"
                      >
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {link.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              コード: {link.code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={link.url}
                              className="h-8 w-64 border-slate-200 bg-slate-50 text-xs text-slate-600"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 shrink-0 border-slate-200 p-0 hover:bg-slate-100"
                              onClick={() => handleCopy(link.id, link.url)}
                            >
                              {copiedId === link.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-slate-900">
                            {link.clicks.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-semibold text-emerald-600">
                            {link.conversions}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="h-9 border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新しいトラッキングURLを発行
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
