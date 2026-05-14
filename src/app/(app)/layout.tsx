import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth"
import { Toaster } from "@/components/ui/sonner"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar role={profile.role} fullName={profile.full_name} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar role={profile.role} fullName={profile.full_name} />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <Toaster richColors closeButton position="top-right" />
      </div>
    </div>
  )
}
