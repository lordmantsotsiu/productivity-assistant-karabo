import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Mic, MicOff, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, detectPII, PIIWarning, HumanLoopNotice } from "@/components/Disclaimers";
import { coachReply } from "@/lib/ai.functions";
import { useLocal, getUserSnapshot } from "@/lib/store";
import { toast } from "sonner";
import { toastServerError } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Coach Karabo" },
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
  const [messages, setMessages] = useLocal<Msg[]>("ai_coach_messages", [WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const fn = useServerFn(coachReply);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pii = detectPII(input);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSttSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalBuffer = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalBuffer += t + " ";
        else interim += t;
      }
      setInput((finalBuffer + interim).trim());
    };
    rec.onerror = (e: any) => {
      toast.error(`Mic error: ${e.error ?? "unknown"}`);
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    recognitionRef.current = { rec, reset: () => (finalBuffer = "") };
    return () => {
      try { rec.stop(); } catch {}
    };
  }, []);

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
      const res = await fn({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: getUserSnapshot(),
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.text }]);
    } catch (e) {
      toastServerError(e, "Karabo couldn't respond just now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleMic() {
    if (!sttSupported || !recognitionRef.current) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    const { rec, reset } = recognitionRef.current;
    if (recording) {
      try { rec.stop(); } catch {}
      setRecording(false);
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Microphone permission denied.");
      return;
    }
    reset();
    try {
      rec.start();
      setRecording(true);
      toast.info("Listening… speak now.");
    } catch (err) {
      toast.error("Could not start microphone.");
    }
  }

  function clearChat() {
    setMessages([WELCOME]);
    toast.success("Chat cleared.");
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
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/40">
            <span className="text-xs text-muted-foreground">
              {messages.length - 1} message{messages.length - 1 === 1 ? "" : "s"} · saved on this device
            </span>
            <Button variant="ghost" size="sm" onClick={clearChat} className="h-7 text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
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
                  {m.role === "assistant" ? (
                    <div className="space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_a]:underline [&_a]:text-primary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
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
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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