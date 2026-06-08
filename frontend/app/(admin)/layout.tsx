import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/admin/auth-guard";
import { AdminSidebar } from "@/components/admin/sidebar";
import { SidebarProvider } from "@/contexts/sidebar-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <SidebarProvider>
          <div className="flex min-h-screen overflow-x-hidden">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0 relative">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
