"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Sparkles,
  History,
  HandCoins,
  Settings,
  Shield,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const menuItems = [
  { icon: LayoutDashboard, label: "ダッシュボード", href: "/" },
  { icon: Users, label: "顧問先CRM", href: "/clients" },
  { icon: Sparkles, label: "AI 5秒スクリーニング", href: "/screenings" },
  { icon: History, label: "提案・ロードマップ履歴", href: "/history" },
  { icon: HandCoins, label: "コンサル紹介・報酬管理", href: "/referrals" },
  { icon: Settings, label: "事務所設定", href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0">
      {/* Brand */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">
              補助金防衛クラウド
            </h1>
            <span className="text-indigo-400 text-xs font-semibold">Pro</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-slate-700">
            <AvatarImage src="https://api.dicebear.com/7.x/initials/png?seed=User&size=96" alt="User" />
            <AvatarFallback className="bg-slate-700 text-slate-300 text-sm font-medium">
              税
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              〇〇税理士事務所
            </p>
            <Badge className="mt-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-[10px] px-1.5 py-0">
              Premium Plan
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  )
}
