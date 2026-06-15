import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Mail,
  FileText,
  CalendarDays,
  Brain,
  Sparkles,
  Heart,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Email Generator", icon: Mail },
  { to: "/reply", label: "Reply Assistant", icon: Inbox },
  { to: "/notes", label: "Notes Summarizer", icon: FileText },
  { to: "/planner", label: "Task Planner", icon: CalendarDays },
  { to: "/coach", label: "Coach Karabo", icon: Heart },
  { to: "/memory", label: "Context Memory", icon: Brain },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sticky top-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div
          className="grid h-9 w-9 place-items-center rounded-xl"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight text-sidebar-foreground">
            Karabo
          </div>
          <div className="text-[11px] text-muted-foreground -mt-0.5">
            Workplace AI Assistant
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="rounded-lg bg-card/60 p-3 text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-primary">⚠️ Human-in-the-Loop:</span> Always review
          AI outputs before professional use.
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden sticky top-0 z-30 flex gap-1 overflow-x-auto border-b border-border bg-background/95 backdrop-blur px-3 py-2">
      {items.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs shrink-0",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}