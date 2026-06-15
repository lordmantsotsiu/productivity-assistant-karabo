import { toast } from "sonner";

/**
 * Map server-function errors to safe, user-facing toast messages.
 * Raw error text is logged to the console but never shown to the user,
 * to avoid leaking internal service details (missing keys, gateway
 * payloads, stack traces, etc.).
 */
export function toastServerError(err: unknown, fallback = "Something went wrong. Please try again.") {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  // Keep the detail in the browser console for debugging only.
  if (err) console.error("[server-fn]", err);

  if (raw.includes("429")) {
    toast.error("Rate limit reached. Please try again shortly.");
    return;
  }
  if (raw.includes("402")) {
    toast.error("AI credits exhausted. Add credits to continue.");
    return;
  }
  if (raw.includes("403")) {
    toast.error("Request blocked. Please reload the page and try again.");
    return;
  }
  toast.error(fallback);
}