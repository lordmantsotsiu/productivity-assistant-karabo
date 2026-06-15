import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Copy, Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateEmail } from "@/lib/ai.functions";
import { bumpStat, getMemoryContext, useLocal, KEYS, type MemoryItem } from "@/lib/store";
import {
  PageHeader,
  HumanLoopNotice,
  PIIWarning,
  detectPII,
} from "@/components/Disclaimers";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — Karabo" },
      { name: "description", content: "Draft tone-aware professional emails with AI." },
    ],
  }),
  component: EmailPage,
});

function EmailPage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Client");
  const [tone, setTone] = useState("Formal");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usedContext, setUsedContext] = useState(false);
  const [memory] = useLocal<MemoryItem[]>(KEYS.memory, []);
  const fn = useServerFn(generateEmail);

  const pii = detectPII(topic);

  async function onGenerate() {
    if (!topic.trim()) {
      toast.error("Please describe what the email should be about.");
      return;
    }
    setLoading(true);
    setOutput("");
    setCopied(false);
    try {
      const ctx = getMemoryContext();
      setUsedContext(ctx.length > 0);
      const res = await fn({ data: { topic, audience, tone, context: ctx } });
      setOutput(res.text);
      bumpStat("emailsDrafted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate";
      if (msg.includes("429")) toast.error("Rate limit reached. Try again shortly.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add credits to continue.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <PageHeader
        icon={<Mail className="h-6 w-6" />}
        title="Smart Email Generator"
        description="Generate polished, audience-aware emails in seconds."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Team">Team</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Formal">Formal</SelectItem>
                  <SelectItem value="Informal">Informal</SelectItem>
                  <SelectItem value="Persuasive">Persuasive</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Context / Topic</Label>
            <Textarea
              rows={8}
              placeholder="e.g. Follow up with client about the Q4 proposal deadline and request a meeting next week."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          {pii ? <PIIWarning term={pii} /> : null}

          {memory.length > 0 ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {memory.length} saved memory snippet{memory.length === 1 ? "" : "s"} will be applied.
            </div>
          ) : null}

          <Button onClick={onGenerate} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Email</>
            )}
          </Button>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <Label>Generated Email</Label>
            <Button
              size="sm"
              variant="secondary"
              onClick={copy}
              disabled={!output}
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 mr-1.5" /> Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</>
              )}
            </Button>
          </div>
          {usedContext && output ? (
            <div className="text-[11px] text-primary flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Applying Saved Context
            </div>
          ) : null}
          <div className="min-h-[280px] rounded-lg border border-border bg-background/40 p-4 whitespace-pre-wrap text-sm leading-relaxed">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 w-2/3 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-5/6 bg-muted rounded" />
                <div className="h-3 w-4/6 bg-muted rounded" />
              </div>
            ) : output ? (
              output
            ) : (
              <span className="text-muted-foreground">
                Your generated email will appear here.
              </span>
            )}
          </div>
          <HumanLoopNotice />
        </div>
      </div>
    </div>
  );
}