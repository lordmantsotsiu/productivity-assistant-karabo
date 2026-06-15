import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Inbox,
  Loader2,
  Sparkles,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { toastServerError } from "@/lib/error-messages";
import { suggestReplies } from "@/lib/ai.functions";
import { getMemoryContext } from "@/lib/store";
import {
  PageHeader,
  HumanLoopNotice,
  PIIWarning,
  detectPII,
} from "@/components/Disclaimers";

export const Route = createFileRoute("/reply")({
  head: () => ({
    meta: [
      { title: "Email Reader & Reply Assistant — Karabo" },
      {
        name: "description",
        content:
          "Paste an email and get a summary plus three suggested replies.",
      },
    ],
  }),
  component: ReplyPage,
});

type Reply = { label: string; strategy: string; body: string };

function ReplyPage() {
  const [email, setEmail] = useState("");
  const [tone, setTone] = useState("Professional");
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    asks: string[];
    replies: Reply[];
  } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const fn = useServerFn(suggestReplies);

  const pii = detectPII(email);

  async function onAnalyze() {
    if (email.trim().length < 10) {
      toast.error("Paste an email first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fn({
        data: { email, tone, intent, context: getMemoryContext() },
      });
      setResult(res);
    } catch (e) {
      toastServerError(e, "Couldn't analyze the email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Reply copied");
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  return (
    <div>
      <PageHeader
        icon={<Inbox className="h-6 w-6" />}
        title="Email Reader & Reply Assistant"
        description="Paste an inbound email — get a summary, the sender's asks, and three reply drafts."
      />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label>Inbound Email</Label>
            <Textarea
              rows={14}
              placeholder="Paste the full email here, including any signature or quoted thread."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reply Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Concise">Concise</SelectItem>
                  <SelectItem value="Apologetic">Apologetic</SelectItem>
                  <SelectItem value="Assertive">Assertive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Your Intent (optional)</Label>
              <Input
                placeholder="e.g. decline politely"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
              />
            </div>
          </div>

          {pii ? <PIIWarning term={pii} /> : null}

          <Button onClick={onAnalyze} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reading…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Suggest Replies</>
            )}
          </Button>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Summary</h3>
            </div>
            {loading ? (
              <Skeleton />
            ) : result?.summary ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {result.summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                The summary will appear here.
              </p>
            )}
            {result?.asks?.length ? (
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Sender is asking
                </div>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  {result.asks.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {loading ? (
              <>
                <ReplySkeleton />
                <ReplySkeleton />
              </>
            ) : result?.replies?.length ? (
              result.replies.map((r, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{r.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.strategy}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copy(r.body, i)}
                    >
                      {copiedIdx === i ? (
                        <><Check className="h-3.5 w-3.5 mr-1.5" /> Copied</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</>
                      )}
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {r.body}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Three reply drafts will appear here — pick the one that fits and
                copy it.
              </div>
            )}
          </div>

          <HumanLoopNotice />
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 w-2/3 bg-muted rounded" />
      <div className="h-3 w-full bg-muted rounded" />
    </div>
  );
}

function ReplySkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2 animate-pulse">
      <div className="h-3 w-1/3 bg-muted rounded" />
      <div className="h-20 w-full bg-muted/60 rounded" />
    </div>
  );
}