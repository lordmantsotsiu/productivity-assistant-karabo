import { useEffect, useState, useCallback } from "react";

export type Priority = "high" | "medium" | "low";
export type Task = {
  id: string;
  title: string;
  due?: string | null;
  priority?: Priority;
  done?: boolean;
  createdAt: number;
};
export type MemoryItem = { id: string; text: string; createdAt: number };
export type Stats = { emailsDrafted: number; notesSummarized: number };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("ai-store", { detail: { key } }));
}

export function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    setValue(read(key, fallback));
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ key: string }>;
      if (ev.detail?.key === key) setValue(read(key, fallback));
    };
    window.addEventListener("ai-store", handler);
    return () => window.removeEventListener("ai-store", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return [value, update] as const;
}

export const KEYS = {
  tasks: "ai_tasks",
  memory: "ai_memory",
  stats: "ai_stats",
};

export function addTask(title: string, due?: string | null) {
  const tasks = read<Task[]>(KEYS.tasks, []);
  tasks.push({
    id: crypto.randomUUID(),
    title,
    due: due ?? null,
    done: false,
    createdAt: Date.now(),
  });
  write(KEYS.tasks, tasks);
}

export function bumpStat(key: keyof Stats) {
  const s = read<Stats>(KEYS.stats, { emailsDrafted: 0, notesSummarized: 0 });
  s[key] = (s[key] ?? 0) + 1;
  write(KEYS.stats, s);
}

export function getMemoryContext(): string {
  const m = read<MemoryItem[]>(KEYS.memory, []);
  return m.map((x) => `- ${x.text}`).join("\n");
}