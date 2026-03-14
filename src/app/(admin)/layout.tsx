import { AdminSidebar } from "@/components/layouts/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="ml-48 min-h-screen">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
