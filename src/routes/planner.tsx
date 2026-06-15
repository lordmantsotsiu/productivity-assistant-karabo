import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Plus,
  Loader2,
  Sparkles,
  Trash2,
  Flame,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useLocal,
  KEYS,
  type Task,
  type Priority,
  getMemoryContext,
} from "@/lib/store";
import { prioritizeTasks } from "@/lib/ai.functions";
import {
  PageHeader,
  HumanLoopNotice,
} from "@/components/Disclaimers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — Karabo" },
      { name: "description", content: "Plan, prioritize, and reorder tasks with AI." },
    ],
  }),
  component: PlannerPage,
});

const priorityStyles: Record<Priority, string> = {
  high: "border-destructive/50 bg-destructive/10 text-destructive",
  medium: "border-primary/50 bg-primary/10 text-primary",
  low: "border-accent/40 bg-accent/10 text-accent",
};

function PlannerPage() {
  const [tasks, setTasks] = useLocal<Task[]>(KEYS.tasks, []);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [strategy, setStrategy] = useState("");
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(prioritizeTasks);

  function add() {
    if (!title.trim()) return;
    const dueValue = due ? (dueTime ? `${due}T${dueTime}` : due) : null;
    setTasks((t) => [
      ...t,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        due: dueValue,
        done: false,
        createdAt: Date.now(),
      },
    ]);
    setTitle("");
    setDue("");
    setDueTime("");
  }

  function toggle(id: string) {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }
  function remove(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
  }

  async function prioritize() {
    if (tasks.length === 0) {
      toast.error("Add some tasks first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fn({
        data: {
          tasks: tasks.map((t) => ({ id: t.id, title: t.title, due: t.due ?? null })),
          context: getMemoryContext(),
        },
      });
      const map = new Map(tasks.map((t) => [t.id, t]));
      const ordered: Task[] = [];
      for (const id of res.orderedIds) {
        const t = map.get(id);
        if (t) {
          ordered.push({ ...t, priority: res.priorityMap[id] ?? t.priority });
          map.delete(id);
        }
      }
      for (const t of map.values()) ordered.push(t);
      setTasks(ordered);
      setStrategy(res.strategy);
      toast.success("Reprioritized with AI");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("429")) toast.error("Rate limit reached.");
      else if (msg.includes("402")) toast.error("AI credits exhausted.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const someday: Task[] = [];
    const todayStr = new Date().toDateString();
    for (const t of tasks) {
      if (!t.due) someday.push(t);
      else if (new Date(t.due).toDateString() === todayStr) today.push(t);
      else upcoming.push(t);
    }
    return { today, upcoming, someday };
  }, [tasks]);

  return (
    <div>
      <PageHeader
        icon={<CalendarDays className="h-6 w-6" />}
        title="AI Task Planner"
        description="Add tasks, push items from meetings, and let AI reorder by urgency."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <Label>New Task</Label>
            <Input
              placeholder="e.g. Send Q4 proposal to Acme"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <Input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!due}
              placeholder="Time (optional)"
            />
            <Button onClick={add} className="w-full" variant="secondary">
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">AI Prioritize</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Reorders by urgency and surfaces a time-optimization strategy.
            </p>
            <Button onClick={prioritize} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Thinking…</>
              ) : (
                <><Flame className="h-4 w-4 mr-2" /> Prioritize with AI</>
              )}
            </Button>
            {strategy ? (
              <div className="text-xs text-muted-foreground leading-relaxed rounded-lg bg-background/40 p-3 border border-border">
                {strategy}
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Section title="Today" icon={<Clock className="h-4 w-4" />} tasks={grouped.today} toggle={toggle} remove={remove} />
          <Section title="Upcoming" icon={<CalendarDays className="h-4 w-4" />} tasks={grouped.upcoming} toggle={toggle} remove={remove} />
          <Section title="Someday" icon={<Sparkles className="h-4 w-4" />} tasks={grouped.someday} toggle={toggle} remove={remove} />
          <HumanLoopNotice />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  tasks,
  toggle,
  remove,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        <span className="text-primary">{icon}</span>
        {title}
        <span className="ml-auto text-xs font-normal text-muted-foreground normal-case">
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks here.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className={cn(
                "group flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 transition-colors",
                t.done && "opacity-60",
              )}
            >
              <Checkbox checked={!!t.done} onCheckedChange={() => toggle(t.id)} />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm", t.done && "line-through")}>{t.title}</div>
                {t.due ? (
                  <div className="text-[11px] text-muted-foreground">
                    Due {new Date(t.due).toLocaleDateString()}
                  </div>
                ) : null}
              </div>
              {t.priority ? (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                    priorityStyles[t.priority],
                  )}
                >
                  {t.priority}
                </span>
              ) : null}
              {t.done ? <CheckCircle2 className="h-4 w-4 text-accent" /> : null}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => remove(t.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}