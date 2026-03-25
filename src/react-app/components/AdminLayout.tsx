import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  MapPin,
  Box,
  CreditCard,
  Calendar,
  Users,
  ChevronLeft,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@getmocha/users-service/react";

const adminNavLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/pods", label: "Pods", icon: Box },
  { href: "/admin/memberships", label: "Memberships", icon: CreditCard },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/members", label: "Members", icon: Users },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isPending } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }
      try {
        const res = await fetch("/api/admin/check");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    }
    if (!isPending) {
      checkAdmin();
    }
  }, [user, isPending]);

  if (isPending || checkingAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <Shield className="h-16 w-16 text-violet-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
          <p className="text-slate-400 mb-6">Please sign in to access the admin dashboard.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You don't have admin privileges. Contact an administrator if you believe this is an error.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-white">Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          {/* Sidebar Header */}
          <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-white">Capsule Admin</span>
              <p className="text-xs text-slate-500">Management Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 mt-14 lg:mt-0">
            {adminNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.exact
                ? location.pathname === link.href
                : location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Back to App */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to App
            </Link>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)]">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
