import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocal, KEYS, type MemoryItem } from "@/lib/store";
import { PageHeader } from "@/components/Disclaimers";
import { toast } from "sonner";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Context Memory — CAPACITI" },
      { name: "description", content: "Save persistent context the AI will apply to your work." },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const [memory, setMemory] = useLocal<MemoryItem[]>(KEYS.memory, []);
  const [text, setText] = useState("");

  function add() {
    if (!text.trim()) return;
    setMemory((m) => [
      ...m,
      { id: crypto.randomUUID(), text: text.trim(), createdAt: Date.now() },
    ]);
    setText("");
    toast.success("Memory saved");
  }

  function remove(id: string) {
    setMemory((m) => m.filter((x) => x.id !== id));
  }

  const examples = [
    "My manager's name is John Patel.",
    "Our project deadline is Friday at 5pm.",
    "I prefer concise, bullet-pointed emails.",
    "Sign all client emails as 'Best, Sam'.",
  ];

  return (
    <div>
      <PageHeader
        icon={<Brain className="h-6 w-6" />}
        title="Context Memory Vault"
        description="Save persistent snippets — names, deadlines, tone preferences. AI will quietly apply them across every feature."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <Label>Remember this…</Label>
            <Input
              placeholder="e.g. Our company colors are blue and emerald."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Save Memory
            </Button>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Examples</h3>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {examples.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Saved Memories</h3>
            <span className="text-xs text-muted-foreground">{memory.length} item{memory.length === 1 ? "" : "s"}</span>
          </div>
          {memory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No memories yet. Save a snippet on the left to personalize every
              AI generation.
            </p>
          ) : (
            <ul className="space-y-2">
              {memory.map((m) => (
                <li
                  key={m.id}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
                >
                  <Brain className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1 text-sm">{m.text}</div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => remove(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}