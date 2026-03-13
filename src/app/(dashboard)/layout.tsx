import { Sidebar } from "@/components/layouts/sidebar"
import { Search, Bell, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogoutButton } from "@/components/auth/logout-button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">ホーム</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-900 font-medium">ダッシュボード</span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="顧問先、補助金を検索..."
                className="w-72 h-10 pl-10 pr-4 bg-slate-100 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Notification Bell */}
            <button className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* User Avatar + Logout */}
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 border border-slate-200">
                <AvatarImage src="https://api.dicebear.com/7.x/initials/png?seed=User&size=96" alt="User" />
                <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">
                  田
                </AvatarFallback>
              </Avatar>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
