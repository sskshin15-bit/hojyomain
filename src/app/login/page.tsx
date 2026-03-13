"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LogIn, Mail, Lock, ArrowRight, Loader2, UserPlus } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type Mode = "signin" | "signup"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) === "signup" ? "signup" : "signin",
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        // メール確認フローを前提としたシンプルなメッセージ
        setError(
          "確認メールを送信しました。メールボックスを確認し、案内に従ってアカウントを有効化してください。",
        )
      } else {
        const {
          data: { session },
          error: signInError,
        } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        if (session) {
          router.push("/screenings")
          router.refresh()
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "認証中にエラーが発生しました。しばらくしてから再度お試しください。")
    } finally {
      setLoading(false)
    }
  }

  const isSignIn = mode === "signin"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            補助金防衛クラウド Pro
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            税理士向けダッシュボードにサインイン
          </h1>
          <p className="text-sm text-slate-400">
            顧問先の補助金スクリーニングや提案履歴を、安全なワークスペースで一元管理します。
          </p>
        </div>

        <Card className="border-slate-800/80 bg-slate-900/80 backdrop-blur shadow-xl shadow-slate-950/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  {isSignIn ? "ログイン" : "新規登録"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  {isSignIn
                    ? "登録済みのメールアドレスとパスワードでサインインしてください。"
                    : "初めてご利用の方は、メールアドレスとパスワードを設定してアカウントを作成します。"}
                </CardDescription>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-1 text-[10px] font-medium text-slate-300 border border-slate-700/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Supabase Authentication
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-900/60 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isSignIn
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  !isSignIn
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                新規登録
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-slate-200">
                  メールアドレス
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tax-accountant@example.com"
                    className="pl-9 bg-slate-900/80 border-slate-700 text-slate-50 placeholder:text-slate-500 focus-visible:ring-slate-300 focus-visible:border-slate-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-slate-200">
                  パスワード
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignIn ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    placeholder="最低6文字以上"
                    className="pl-9 bg-slate-900/80 border-slate-700 text-slate-50 placeholder:text-slate-500 focus-visible:ring-slate-300 focus-visible:border-slate-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-amber-300 bg-amber-900/30 border border-amber-700/60 rounded-md px-3 py-2 leading-relaxed">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold bg-slate-50 text-slate-900 hover:bg-white shadow-md shadow-slate-950/40 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    処理中です…
                  </>
                ) : isSignIn ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    ダッシュボードにログイン
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    アカウントを作成する
                  </>
                )}
              </Button>
            </form>

            <p className="text-[10px] leading-relaxed text-slate-500">
              本サービスは税理士・会計事務所向けの業務専用ツールです。ログインすることで、利用規約およびプライバシーポリシーに同意したものとみなされます。
            </p>
          </CardContent>
        </Card>

        <p className="text-[10px] text-center text-slate-500">
          &copy; {new Date().getFullYear()} 補助金防衛クラウド Pro. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-400">読み込み中…</div>}>
      <LoginForm />
    </Suspense>
  )
}

