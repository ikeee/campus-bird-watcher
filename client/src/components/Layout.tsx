import { Link, useLocation } from "wouter";
import { Bird, BarChart2, BookOpen, Settings, Menu, X, Library } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "实时监控", icon: Bird },
  { href: "/sightings", label: "识别记录", icon: BookOpen },
  { href: "/encyclopedia", label: "鸟类百科", icon: Library },
  { href: "/statistics", label: "历史统计", icon: BarChart2 },
  { href: "/admin", label: "管理后台", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── 顶部导航栏 ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Bird className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Campus Bird Watch
              </div>
              <div className="text-xs text-muted-foreground">校园观鸟站</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 flex flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all",
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* ── 主内容区 ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── 页脚 ── */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Bird className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Campus Bird Watch · 校园智能观鸟站</span>
          </div>
          <div>每一只鸟的到来，都是自然的馈赠</div>
        </div>
      </footer>
    </div>
  );
}
