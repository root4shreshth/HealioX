"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HeartPulse, LayoutDashboard, MapPin, MessageCircle,
  Users, Bell, LogOut, Menu, X, Loader2, Building2,
  UserCog, CalendarDays, AlertCircle, Settings2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

// Strict role-based nav — no default catch-all that exposes all portals
const NAV_BY_ROLE: Record<string, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  caregiver: [
    { href: "/caregiver", label: "My Visits", icon: MapPin },
    { href: "/caregiver/reports", label: "Reports", icon: FileText },
  ],
  patient: [
    { href: "/patient", label: "AI Assistant", icon: MessageCircle },
  ],
  family: [
    { href: "/dashboard", label: "Care Dashboard", icon: LayoutDashboard },
  ],
  provider_admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/caregivers", label: "Caregivers", icon: UserCog },
    { href: "/admin/patients", label: "Patients", icon: Users },
    { href: "/admin/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/admin/alerts", label: "Alerts", icon: AlertCircle },
    { href: "/admin/settings", label: "Settings", icon: Settings2 },
  ],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, profile, loading } = useAuth();

  const role = profile?.role || "";
  // Only show nav items once role is confirmed; empty while loading
  const navItems = role ? (NAV_BY_ROLE[role] || []) : [];

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();

    // Race: sign out vs 4s timeout — whichever wins, we redirect
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));
    const signout = supabase.auth.signOut();
    await Promise.race([signout, timeout]);

    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  // Not logged in — redirect handled by middleware; show nothing here
  if (!user) {
    router.push("/login");
    return null;
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "" : ""}>
      <div className={`flex items-center ${mobile ? "justify-between px-4" : "gap-2 px-6"} h-16 border-b border-border`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-[var(--font-heading)] font-bold text-lg tracking-tight">AayuCare</span>
        </div>
        {mobile && (
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Role badge */}
      <div className="px-6 py-3 border-b border-border">
        <p className="text-sm font-semibold">{profile?.full_name || "User"}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {role ? role.replace("_", " ") : "Loading..."}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button onClick={handleSignOut} disabled={signingOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 w-full transition-colors disabled:opacity-60">
          {signingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border bg-white fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar mobile />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <header className="h-16 border-b border-border bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-[var(--font-heading)] text-lg font-bold capitalize">
              {pathname === "/dashboard" ? "Dashboard"
            : pathname === "/caregiver" ? "My Visits"
            : pathname === "/caregiver/reports" ? "Reports"
            : pathname === "/patient" ? "AI Check-in"
            : pathname === "/admin" ? "Admin Dashboard"
            : pathname === "/admin/caregivers" ? "Caregivers"
            : pathname === "/admin/patients" ? "Patients"
            : pathname === "/admin/schedule" ? "Schedule"
            : pathname === "/admin/alerts" ? "Alerts"
            : pathname === "/admin/settings" ? "Organization Settings"
            : pathname.startsWith("/dashboard/patients") ? "Patients"
            : pathname.split("/").pop() || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
              <span className="text-xs font-bold text-brand">{initials}</span>
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
