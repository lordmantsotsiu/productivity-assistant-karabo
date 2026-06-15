import { AlertTriangle, ShieldAlert } from "lucide-react";

const SENSITIVE = [
  "password",
  "passwd",
  "credit card",
  "card number",
  "cvv",
  "ssn",
  "social security",
  "id number",
  "passport",
  "api key",
  "secret key",
];

export function detectPII(text: string): string | null {
  const lower = text.toLowerCase();
  const hit = SENSITIVE.find((w) => lower.includes(w));
  return hit ?? null;
}

export function PIIWarning({ term }: { term: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
      <div>
        <div className="font-medium text-destructive-foreground">
          🔒 Privacy Guard
        </div>
        <div className="text-muted-foreground">
          Detected sensitive term <span className="font-mono">"{term}"</span>.
          Please avoid pasting sensitive personal data into public AI models.
        </div>
      </div>
    </div>
  );
}

export function HumanLoopNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
      <AlertTriangle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <span>
        <span className="font-medium text-foreground">
          Human-in-the-Loop Verification Required:
        </span>{" "}
        AI outputs can contain inaccuracies. Please review and validate all data
        before professional use.
      </span>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      {icon ? (
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}