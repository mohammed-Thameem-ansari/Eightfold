"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Home, BarChart3, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface TopNavProps {
  statusBadges?: React.ReactNode;
}

export function TopNav({ statusBadges }: TopNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/workflow", label: "Workflow", icon: Activity },
  ];

  return (
    <header className="border-b border-border/20 bg-background/95 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-foreground to-foreground/80 flex items-center justify-center shadow-md ring-1 ring-foreground/10 transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5 text-background" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold tracking-tight leading-none">Research Agent</h1>
            <p className="text-[10px] text-muted-foreground font-medium">AI-Powered Intelligence</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 transition-all",
                    isActive && "shadow-sm"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Status & Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {statusBadges}
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-t border-border/20 bg-background/95 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-1.5 text-xs transition-all",
                    isActive && "shadow-sm"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
