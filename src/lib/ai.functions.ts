import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSameOrigin } from "./same-origin.middleware";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

const EmailInput = z.object({
  topic: z.string().min(1).max(2000),
  audience: z.string().min(1).max(50),
  tone: z.string().min(1).max(50),
  context: z.string().max(2000).optional().default(""),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSameOrigin])
  .inputValidator((d: unknown) => EmailInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const ctxBlock = data.context
      ? `\n\nSaved user context to consider (apply naturally where relevant):\n${data.context}`
      : "";
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You are an expert professional email writer. Produce ready-to-send emails with a Subject line first, then the body. Be concise, clear, and audience-appropriate.",
      prompt: `Write an email.\nAudience: ${data.audience}\nTone: ${data.tone}\nTopic / context: ${data.topic}${ctxBlock}\n\nReturn format:\nSubject: <subject>\n\n<body>`,
    });
    return { text };
  });

const SummarizeInput = z.object({
  notes: z.string().min(10).max(20000),
  context: z.string().max(2000).optional().default(""),
});

export const summarizeNotes = createServerFn({ method: "POST" })
  .middleware([requireSameOrigin])
  .inputValidator((d: unknown) => SummarizeInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const ctxBlock = data.context
      ? `\n\nSaved user context:\n${data.context}`
      : "";
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You summarize meeting notes. Always respond in strict JSON only — no markdown fences, no commentary.",
      prompt: `Summarize the following meeting notes and extract action items.${ctxBlock}\n\nReturn JSON exactly in this shape:\n{\n  "summary": "2-4 sentence executive summary",\n  "decisions": ["decision 1", "decision 2"],\n  "actionItems": [{"task": "short imperative task", "owner": "name or null", "due": "ISO date or null"}]\n}\n\nNotes:\n${data.notes}`,
    });
    let parsed: {
      summary: string;
      decisions: string[];
      actionItems: { task: string; owner: string | null; due: string | null }[];
    } = { summary: "", decisions: [], actionItems: [] };
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed.summary = text;
    }
    return parsed;
  });

const PrioritizeInput = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        due: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
  context: z.string().max(2000).optional().default(""),
});

export const prioritizeTasks = createServerFn({ method: "POST" })
  .middleware([requireSameOrigin])
  .inputValidator((d: unknown) => PrioritizeInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const ctxBlock = data.context
      ? `\nSaved user context:\n${data.context}\n`
      : "";
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You are a productivity coach. Respond only with strict JSON, no markdown.",
      prompt: `Given these tasks, reorder them by urgency and importance and give a brief time-optimization strategy.${ctxBlock}\nTasks:\n${JSON.stringify(data.tasks)}\n\nReturn JSON:\n{\n  "orderedIds": ["id1","id2",...],\n  "priorityMap": {"id1": "high|medium|low"},\n  "strategy": "1-3 sentences with concrete time-optimization advice"\n}`,
    });
    let parsed: {
      orderedIds: string[];
      priorityMap: Record<string, "high" | "medium" | "low">;
      strategy: string;
    } = { orderedIds: data.tasks.map((t) => t.id), priorityMap: {}, strategy: "" };
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed.strategy = text;
    }
    return parsed;
  });

const CoachInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
  context: z.string().max(6000).optional().default(""),
});

export const coachReply = createServerFn({ method: "POST" })
  .middleware([requireSameOrigin])
  .inputValidator((d: unknown) => CoachInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const ctxBlock = data.context
      ? `\n\nLive snapshot of the user's workspace (use it naturally; reference specific tasks, deadlines, or saved memory by name when relevant — do not dump the whole list back at them):\n${data.context}`
      : "";
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        `You are Karabo, a warm, attentive workplace well-being and productivity coach. You speak with the user like a thoughtful friend who happens to know their workspace — calm, human, never robotic. You help them navigate stress, task paralysis, burnout, and feeling overwhelmed, and you also help them think through their actual work (tasks, meetings, priorities, drafted emails, saved notes).

Style and structure rules:
- Write in clear, natural prose. Vary sentence length. Avoid corporate filler.
- Use Markdown thoughtfully: short paragraphs, **bold** for emphasis, and bullet lists when you give steps or options. Use a small heading (### ) only when the reply has multiple distinct sections.
- Keep replies under ~200 words unless the user asks for depth.
- When you suggest actions, give 1–3 specific, concrete next steps the user can do in the next few minutes.
- Reference the user's real context (a specific open task, a saved memory, today's load) when it makes the reply feel personal — but never paste the whole list back at them, and never invent details that aren't in the snapshot.
- If the snapshot is empty or thin, just coach gently without pretending to know more.
- Never give medical, legal, or financial advice. Gently suggest professional support when something is beyond a coach's scope.${ctxBlock}`,
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return { text };
  });

const ReplyInput = z.object({
  email: z.string().min(10).max(8000),
  tone: z.string().min(1).max(40).optional().default("Professional"),
  intent: z.string().max(400).optional().default(""),
  context: z.string().max(2000).optional().default(""),
});

export const suggestReplies = createServerFn({ method: "POST" })
  .middleware([requireSameOrigin])
  .inputValidator((d: unknown) => ReplyInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const ctxBlock = data.context
      ? `\n\nSaved user context (apply only if relevant):\n${data.context}`
      : "";
    const intentBlock = data.intent
      ? `\n\nThe user wants the reply to: ${data.intent}`
      : "";
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You read inbound emails and propose ready-to-send replies. Respond ONLY in strict JSON — no markdown fences, no commentary.",
      prompt: `Read the email below and produce 3 distinct reply drafts. Each draft has a short label, a 1-line strategy, and a complete reply body (no Subject line, no greeting placeholders like [Name] — use what you can infer from the email, otherwise use a neutral greeting). Also summarize the email in 1–2 sentences and list any concrete asks the sender made.

Tone preference: ${data.tone}${intentBlock}${ctxBlock}

Return JSON exactly in this shape:
{
  "summary": "1–2 sentence summary of the inbound email",
  "asks": ["concrete ask 1", "concrete ask 2"],
  "replies": [
    { "label": "Short label (e.g. Accept & propose time)", "strategy": "1-line strategy", "body": "Full reply body" }
  ]
}

Inbound email:
"""
${data.email}
"""`,
    });
    let parsed: {
      summary: string;
      asks: string[];
      replies: { label: string; strategy: string; body: string }[];
    } = { summary: "", asks: [], replies: [] };
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed.summary = text;
    }
    return parsed;
  });