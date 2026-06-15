import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  Loader2,
  Plus,
  Sparkles,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { summarizeNotes } from "@/lib/ai.functions";
import { addTask, bumpStat, getMemoryContext } from "@/lib/store";
import {
  PageHeader,
  HumanLoopNotice,
  PIIWarning,
  detectPII,
} from "@/components/Disclaimers";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — CAPACITI" },
      { name: "description", content: "Summarize meetings and extract action items with AI." },
    ],
  }),
  component: NotesPage,
});

type ActionItem = { task: string; owner: string | null; due: string | null };

function NotesPage() {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    decisions: string[];
    actionItems: ActionItem[];
  } | null>(null);
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const fn = useServerFn(summarizeNotes);

  const pii = detectPII(notes);

  async function onSummarize() {
    if (notes.trim().length < 10) {
      toast.error("Paste some meeting notes first.");
      return;
    }
    setLoading(true);
    setResult(null);
    setAdded({});
    try {
      const res = await fn({ data: { notes, context: getMemoryContext() } });
      setResult(res);
      bumpStat("notesSummarized");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to summarize";
      if (msg.includes("429")) toast.error("Rate limit reached.");
      else if (msg.includes("402")) toast.error("AI credits exhausted.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function pushToSchedule(idx: number, item: ActionItem) {
    addTask(item.task, item.due);
    setAdded((s) => ({ ...s, [idx]: true }));
    toast.success("Added to your schedule", {
      description: item.task,
    });
  }

  return (
    <div>
      <PageHeader
        icon={<FileText className="h-6 w-6" />}
        title="Meeting Notes Summarizer"
        description="Turn raw notes into a clean summary, decisions, and actionable tasks."
      />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label>Raw Meeting Notes</Label>
            <Textarea
              rows={16}
              placeholder="Paste your meeting transcript or notes here…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {pii ? <PIIWarning term={pii} /> : null}
          <Button onClick={onSummarize} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Summarizing…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Summarize</>
            )}
          </Button>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Executive Summary</h3>
            </div>
            {loading ? (
              <SkeletonLines />
            ) : result?.summary ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {result.summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your summary will appear here.
              </p>
            )}

            {result?.decisions?.length ? (
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Key Decisions
                </div>
                <ul className="space-y-1.5 text-sm">
                  {result.decisions.map((d, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Action Items</h3>
            </div>
            {loading ? (
              <SkeletonLines />
            ) : result?.actionItems?.length ? (
              <ul className="space-y-2">
                {result.actionItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{item.task}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {item.owner ? `Owner: ${item.owner}` : "No owner"}
                        {item.due ? ` · Due ${item.due}` : ""}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={added[i] ? "secondary" : "default"}
                      onClick={() => pushToSchedule(i, item)}
                      disabled={added[i]}
                    >
                      {added[i] ? (
                        <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Added</>
                      ) : (
                        <><Plus className="h-3.5 w-3.5 mr-1.5" /> Add to Schedule</>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Action items will appear here, each with a one-click "Add to
                Schedule" button.
              </p>
            )}
          </div>

          <HumanLoopNotice />
        </div>
      </div>
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 w-2/3 bg-muted rounded" />
      <div className="h-3 w-full bg-muted rounded" />
      <div className="h-3 w-5/6 bg-muted rounded" />
    </div>
  );
}