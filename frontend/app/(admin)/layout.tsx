import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/admin/auth-guard";
import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-screen">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
