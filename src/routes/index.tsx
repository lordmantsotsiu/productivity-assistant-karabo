import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useLocal, KEYS, type Task, type MemoryItem, type Stats } from "@/lib/store";
import { HumanLoopNotice } from "@/components/Disclaimers";
import {
  Mail,
  FileText,
  CalendarDays,
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  Heart,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Karabo Workspace AI" },
      { name: "description", content: "Your AI-powered workplace command center: stats, quick actions, and responsible AI guidance." },
    ],
  }),
  component: Index,
});

function Index() {
  const [tasks] = useLocal<Task[]>(KEYS.tasks, []);
  const [memory] = useLocal<MemoryItem[]>(KEYS.memory, []);
  const [stats] = useLocal<Stats>(KEYS.stats, { emailsDrafted: 0, notesSummarized: 0 });

  const today = new Date().toDateString();
  const todaysTasks = tasks.filter(
    (t) => t.due && new Date(t.due).toDateString() === today,
  ).length;
  const openTasks = tasks.filter((t) => !t.done).length;

  const quickStats = [
    { label: "Tasks Scheduled Today", value: todaysTasks, icon: CalendarDays },
    { label: "Open Tasks", value: openTasks, icon: Clock },
    { label: "Emails Drafted", value: stats.emailsDrafted, icon: Mail },
    { label: "Notes Summarized", value: stats.notesSummarized, icon: FileText },
  ];

  const actions = [
    { to: "/email", label: "Draft an Email", desc: "Tone-aware drafts in seconds", icon: Mail },
    { to: "/notes", label: "Summarize Meeting", desc: "Extract action items & decisions", icon: FileText },
    { to: "/planner", label: "Plan Your Day", desc: "Prioritize tasks with AI", icon: CalendarDays },
    { to: "/coach", label: "Talk to Karabo", desc: "Reset, refocus, breathe", icon: Heart },
    { to: "/memory", label: "Save Context", desc: `${memory.length} memories saved`, icon: Brain },
  ];

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-10"
        style={{ background: "linear-gradient(135deg, oklch(0.95 0.02 130), oklch(0.93 0.025 95))" }}
      >
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ background: "var(--gradient-primary)" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" /> A calm start to your day
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            Hello. Let's take it one step at a time.
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Draft thoughtful emails, summarize meetings, plan your day, and
            check in with Karabo — your gentle workplace coach.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickStats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{a.label}</div>
                <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-primary/30 bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">Responsible AI Disclaimer</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This assistant generates suggestions to support your work — not
              replace your judgment. AI output may contain inaccuracies, omissions, or
              bias. Always review, verify sources, and protect sensitive data
              before sharing. You remain the human-in-the-loop.
            </p>
          </div>
        </div>
      </section>

      <HumanLoopNotice />
    </div>
  );
}
