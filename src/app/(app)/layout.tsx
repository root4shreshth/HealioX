"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HeartPulse,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Users,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

// Nav items per role
const NAV_BY_ROLE: Record<string, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  // CAREGIVER: Visit management only. Can trigger AI check-in for patients.
  caregiver: [
    { href: "/caregiver", label: "My Visits", icon: MapPin },
    { href: "/patient", label: "AI Check-in", icon: MessageCircle },
  ],
  // PATIENT: AI Health Assistant is the core experience.
  patient: [
    { href: "/patient", label: "AI Assistant", icon: MessageCircle },
  ],
  // FAMILY: Dashboard focused on their loved one. View-only.
  family: [
    { href: "/dashboard", label: "Care Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/patients", label: "Patient Details", icon: Users },
  ],
  // PROVIDER ADMIN: Full access for organization management.
  provider_admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/caregiver", label: "Visits", icon: MapPin },
    { href: "/patient", label: "AI Check-in", icon: MessageCircle },
    { href: "/dashboard/patients", label: "Patients", icon: Users },
  ],
  // Default — show everything for unassigned roles
  default: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/caregiver", label: "Visits", icon: MapPin },
    { href: "/patient", label: "AI Assistant", icon: MessageCircle },
    { href: "/dashboard/patients", label: "Patients", icon: Users },
  ],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, loading } = useAuth();

  const role = profile?.role || "default";
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.default;
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border bg-white fixed inset-y-0 left-0 z-40">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-[var(--font-heading)] font-bold text-lg tracking-tight">
            HealioX
          </span>
        </div>

        {/* Role badge */}
        <div className="px-6 py-3 border-b border-border">
          <p className="text-sm font-semibold">{profile?.full_name || "User"}</p>
          <p className="text-xs text-muted-foreground capitalize">{role === "default" ? "User" : role.replace("_", " ")}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="font-[var(--font-heading)] font-bold">HealioX</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">{profile?.full_name || "User"}</p>
          <p className="text-xs text-muted-foreground capitalize">{role === "default" ? "User" : role.replace("_", " ")}</p>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 w-full transition-colors">
            <LogOut className="w-5 h-5" />Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-[var(--font-heading)] text-lg font-bold capitalize">
              {pathname === "/dashboard" ? "Dashboard" : pathname === "/caregiver" ? "Visits" : pathname === "/patient" ? "AI Check-in" : pathname.split("/").pop() || "Dashboard"}
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
