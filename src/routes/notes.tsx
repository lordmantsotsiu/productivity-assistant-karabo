import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  Loader2,
  Plus,
  Sparkles,
  CheckCircle2,
  ListChecks,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toastServerError } from "@/lib/error-messages";
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
      { title: "Meeting Notes Summarizer — Karabo" },
      { name: "description", content: "Summarize meetings and extract action items with AI." },
    ],
  }),
  component: NotesPage,
});

type ActionItem = { task: string; owner: string | null; due: string | null };

function NotesPage() {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    summary: string;
    decisions: string[];
    actionItems: ActionItem[];
  } | null>(null);
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const fn = useServerFn(summarizeNotes);

  const pii = detectPII(notes);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setParsing(true);
    try {
      const chunks: string[] = [];
      for (const file of Array.from(files)) {
        const name = file.name.toLowerCase();
        let text = "";
        if (name.endsWith(".pdf")) {
          const pdfjs = await import("pdfjs-dist");
          const worker = await import(
            // @ts-ignore vite worker url import
            "pdfjs-dist/build/pdf.worker.mjs?url"
          );
          pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
          const buf = await file.arrayBuffer();
          const doc = await pdfjs.getDocument({ data: buf }).promise;
          const pages: string[] = [];
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            pages.push(
              content.items
                .map((it: unknown) => (it as { str?: string }).str ?? "")
                .join(" "),
            );
          }
          text = pages.join("\n\n");
        } else if (name.endsWith(".docx")) {
          // @ts-ignore no types for browser bundle
          const mammoth = await import("mammoth/mammoth.browser.js");
          const buf = await file.arrayBuffer();
          const res = await mammoth.extractRawText({ arrayBuffer: buf });
          text = res.value;
        } else if (name.endsWith(".pptx")) {
          const JSZip = (await import("jszip")).default;
          const zip = await JSZip.loadAsync(await file.arrayBuffer());
          const slidePaths = Object.keys(zip.files)
            .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
            .sort((a, b) => {
              const na = parseInt(a.match(/slide(\d+)\.xml/)![1], 10);
              const nb = parseInt(b.match(/slide(\d+)\.xml/)![1], 10);
              return na - nb;
            });
          const slides: string[] = [];
          for (const p of slidePaths) {
            const xml = await zip.files[p].async("string");
            const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
            const slideText = matches
              .map((m) => m.replace(/<[^>]+>/g, ""))
              .join(" ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            if (slideText.trim()) slides.push(slideText.trim());
          }
          text = slides.join("\n\n");
        } else if (name.endsWith(".doc")) {
          toast.error(`Legacy .doc not supported: ${file.name}`, {
            description: "Save as .docx and try again.",
          });
          continue;
        } else {
          // Fallback: try reading as text (covers txt, md, csv, json, html, rtf, log, srt, etc.)
          try {
            text = await file.text();
            // Strip non-printable bytes that indicate a binary file
            const printable = text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
            if (
              text.length > 0 &&
              printable.length / text.length < 0.7 &&
              !file.type.startsWith("text/")
            ) {
              toast.error(`Can't read ${file.name}`, {
                description: "Binary format not supported. Try PDF, DOCX, PPTX, or a text file.",
              });
              continue;
            }
          } catch {
            toast.error(`Can't read ${file.name}`);
            continue;
          }
        }
        if (text.trim()) chunks.push(`--- ${file.name} ---\n${text.trim()}`);
      }
      if (chunks.length) {
        setNotes((prev) =>
          prev.trim() ? `${prev}\n\n${chunks.join("\n\n")}` : chunks.join("\n\n"),
        );
        toast.success(
          `Loaded ${chunks.length} file${chunks.length === 1 ? "" : "s"}`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read file");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
      toastServerError(e, "Couldn't summarize the notes. Please try again.");
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
            <div className="flex items-center justify-between gap-2">
              <Label>Raw Meeting Notes</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown,text/*"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
              >
                {parsing ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Reading…</>
                ) : (
                  <><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload</>
                )}
              </Button>
            </div>
            <Textarea
              rows={16}
              placeholder="Paste notes here or upload a PDF, DOCX, TXT, or MD file…"
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