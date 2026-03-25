import { Link, useLocation } from "react-router";
import { MapPin, User, Calendar, Menu, X, Navigation, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { useState } from "react";
import { useAuth } from "@getmocha/users-service/react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isPending, redirectToLogin, logout } = useAuth();

  const navLinks = [
    { href: "/near-me", label: "Near Me", icon: Navigation },
    { href: "/locations", label: "Locations", icon: MapPin },
    { href: "/bookings", label: "My Bookings", icon: Calendar },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const handleLogin = async () => {
    await redirectToLogin();
  };

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <div className="h-4 w-4 rounded-sm bg-white/90" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Capsule</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link to="/profile" className="flex items-center gap-2 text-sm">
                    {(user as any).google_user_data?.picture ? (
                      <img
                        src={(user as any).google_user_data.picture}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <span className="font-medium hidden lg:inline">
                      {(user as any).google_user_data?.given_name || "User"}
                    </span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleLogin}>
                  Sign In with Google
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-3 mt-3 border-t border-border">
                {isPending ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                      {(user as any).google_user_data?.picture ? (
                        <img
                          src={(user as any).google_user_data.picture}
                          alt="Profile"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <span className="font-medium">
                        {(user as any).google_user_data?.given_name || "User"}
                      </span>
                    </div>
                    <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={handleLogin}>
                    Sign In with Google
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
