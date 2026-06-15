import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Mic, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, detectPII, PIIWarning, HumanLoopNotice } from "@/components/Disclaimers";
import { coachReply } from "@/lib/ai.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Coach Karabo — CAPACITI" },
      { name: "description", content: "A calm workplace well-being coach to help you reset, refocus, and breathe." },
    ],
  }),
  component: CoachPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "Give me a 5-minute breathing exercise",
  "Help me handle a massive to-do list",
  "How do I handle burnout?",
  "I feel stuck and can't start anything",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi, I'm Karabo. Take a slow breath with me. Whatever's weighing on you today — a packed inbox, a project that won't budge, or just feeling worn thin — we can take it one small step at a time. What's on your mind?",
};

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fn = useServerFn(coachReply);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pii = detectPII(input);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fn({ data: { messages: next.map((m) => ({ role: m.role, content: m.content })) } });
      setMessages((m) => [...m, { role: "assistant", content: res.text }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("429")) toast.error("Karabo needs a moment — rate limit reached.");
      else if (msg.includes("402")) toast.error("AI credits exhausted.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function toggleMic() {
    setRecording((r) => !r);
    toast.info(recording ? "Recording stopped (simulated)" : "Listening… (simulated voice capture)");
  }

  return (
    <div>
      <PageHeader
        icon={<Heart className="h-6 w-6" />}
        title="Coach Karabo"
        description="A calm space to reset, refocus, and breathe through your workday."
      />

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col h-[70vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                {m.role === "assistant" ? (
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Heart className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                    You
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "assistant"
                      ? "bg-muted/60 text-foreground"
                      : "bg-primary/90 text-primary-foreground",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex gap-3">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Heart className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border bg-background/40 p-4 space-y-3">
            {pii ? <PIIWarning term={pii} /> : null}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Share what's on your mind…"
                rows={2}
                className="resize-none rounded-2xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <Button
                type="button"
                variant={recording ? "default" : "outline"}
                size="icon"
                className={cn("rounded-full h-11 w-11", recording && "animate-pulse")}
                onClick={toggleMic}
                aria-label="Toggle microphone"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                size="icon"
                className="rounded-full h-11 w-11"
                aria-label="Send"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Quick Prompts</h3>
            </div>
            <div className="space-y-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="w-full text-left text-sm rounded-xl border border-border bg-background/40 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <HumanLoopNotice />
        </div>
      </div>
    </div>
  );
}