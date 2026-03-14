"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Calculator } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCurrentMinimumWage } from "@/lib/minimum-wage"
import { format } from "date-fns"

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
]

function toHalfWidthDigits(value: string): string {
  return value
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, "")
}

export function QuantitativeSimulator() {
  const [open, setOpen] = useState(false)
  const [prefecture, setPrefecture] = useState("")
  const [settlementYear, setSettlementYear] = useState("")
  const [settlementMonth, setSettlementMonth] = useState("")
  const [operatingProfit, setOperatingProfit] = useState("")
  const [minWage, setMinWage] = useState<{ hourly_wage: number; effective_date: string; prefecture: string } | null>(null)
  const [minWageError, setMinWageError] = useState<string | null>(null)

  useEffect(() => {
    if (!prefecture) {
      setMinWage(null)
      setMinWageError(null)
      return
    }
    getCurrentMinimumWage(prefecture).then(({ data, error }) => {
      if (error) {
        setMinWageError(error)
        setMinWage(null)
        return
      }
      if (data) {
        setMinWage({
          hourly_wage: data.hourly_wage,
          effective_date: data.effective_date,
          prefecture: data.prefecture,
        })
        setMinWageError(null)
      } else {
        setMinWage(null)
        setMinWageError("該当データがありません")
      }
    })
  }, [prefecture])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/80 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-slate-600" />
          <span className="text-sm font-semibold text-slate-800">
            定量判定シミュレーター
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          {/* 改修②: 決算年月 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              直近期の決算年月（YYYY年MM月期）
            </Label>
            <p className="text-xs text-slate-500">
              補助金審査の基準となる数字のスタート地点を明示します。適当な見込み数字の入力を防ぐための必須項目です。
            </p>
            <div className="flex gap-2">
              <Select value={settlementYear} onValueChange={setSettlementYear}>
                <SelectTrigger className="w-[120px] border-slate-200">
                  <SelectValue placeholder="年" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={settlementMonth} onValueChange={setSettlementMonth}>
                <SelectTrigger className="w-[100px] border-slate-200">
                  <SelectValue placeholder="月" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}月期
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 都道府県（最低賃金用） */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              事業所所在地（都道府県）
            </Label>
            <Select value={prefecture} onValueChange={setPrefecture}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="都道府県を選択" />
              </SelectTrigger>
              <SelectContent>
                {PREFECTURES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 改修①: 最低賃金の計算根拠 */}
          {minWage && (
            <p className="text-xs text-slate-500">
              ※計算根拠：{minWage.prefecture}の現在の最低賃金 {minWage.hourly_wage.toLocaleString()}円
              （適用開始日: {format(new Date(minWage.effective_date), "yyyy年M月d日")}）を基準に算出しています。
            </p>
          )}
          {minWageError && prefecture && (
            <p className="text-xs text-amber-600">{minWageError}</p>
          )}

          {/* 営業利益（付加価値額シミュレーター用） */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              営業利益（万円）
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="例: 500"
              className="border-slate-200 tabular-nums max-w-[200px]"
              value={operatingProfit}
              onChange={(e) => setOperatingProfit(toHalfWidthDigits(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  )
}
