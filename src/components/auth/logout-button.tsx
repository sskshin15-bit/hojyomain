"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch {
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
      onClick={handleLogout}
      disabled={loading}
    >
      <LogOut className="w-4 h-4" />
      <span className="text-xs">{loading ? "ログアウト中..." : "ログアウト"}</span>
    </Button>
  )
}

