"use client"

import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SharedProposalPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md min-h-screen bg-white pb-32">
        {/* 1. ヘッダー（厳格） */}
        <header className="border-b border-slate-200 px-5 py-4">
          <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            【社外秘】顧問先専用 適合性診断レポート
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" aria-hidden />
            <span className="text-sm font-medium text-slate-700">
              〇〇税理士事務所
            </span>
          </div>
        </header>

        <main className="px-5 py-8">
          {/* 2. 診断結果サマリー */}
          <section>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">
              令和8年度 補助金・助成金 初期適合診断のご報告
            </h1>
            <p className="mt-4 text-sm text-slate-600">
              株式会社ヤマダ 代表取締役様
            </p>

            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 shadow-none">
              <p className="text-sm leading-relaxed text-slate-700">
                貴社の最新の財務データおよび労務状況を基にAIによる初期スクリーニングを実施した結果、以下の制度について要件を充足している可能性が否定できませんでした。該当の有無および申請可否の確定には、詳細な調査と専門家による確認が必要です。
              </p>
            </div>

            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-6">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  要確認の制度例
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  IT導入補助金 2024
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  制度上の上限額（参考）
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  約1,500,000円
                </dd>
              </div>
            </dl>
          </section>

          {/* 3. 今後の進め方とサポート体制 */}
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-slate-900">
              該当の可能性がある場合の支援体制
            </h2>
            <ul className="mt-4 list-none space-y-3 pl-0">
              <li className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                <span>
                  本制度は事業計画の策定等を伴うため、詳細確認のうえで当事務所提携の認定支援機関と連携した申請サポートをご案内いたします。
                </span>
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                <span>
                  貴社側の書類作成等の負担は、可能な限り抑えた形で進められます。
                </span>
              </li>
            </ul>
          </section>

          {/* 注記 */}
          <p className="mt-10 text-xs leading-relaxed text-slate-500">
            本レポートは初期スクリーニングに基づく参考情報であり、申請の可否・採択額は審査機関の判断に委ねられます。該当の可能性が考えられる場合は、詳細な調査および担当税理士・専門家へのご相談をご検討ください。
          </p>

          {/* 次のステップ（CTAへの導線） */}
          <section className="mt-10 rounded-lg border border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-500">
              次のステップ
            </p>
            <p className="mt-2 text-center text-sm text-slate-700">
              詳細な確認・シミュレーションをご希望の方は、<br className="sm:hidden" />
              <span className="font-medium text-slate-900">下のボタン</span>から担当税理士へご連絡ください。
            </p>
            <p className="mt-4 text-center text-xs text-slate-500">
              ↓ 画面下部にボタンがあります
            </p>
          </section>
        </main>

        {/* 4. CTA（固定フッター） */}
        <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-slate-50/95 px-5 py-5 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
          <p className="mb-3 text-center text-xs font-medium text-slate-600">
            ご依頼・ご相談はこちら
          </p>
          <Button
            className="h-14 w-full bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
            type="button"
          >
            詳細な確認・シミュレーションを担当税理士に依頼する
          </Button>
        </div>
      </div>
    </div>
  )
}
