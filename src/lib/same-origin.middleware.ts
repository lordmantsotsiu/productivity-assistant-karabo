import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-function middleware that rejects cross-origin callers.
 * This prevents arbitrary third-party sites / scripts from invoking our
 * AI server functions and draining LOVABLE_API_KEY credits.
 *
 * Browsers always send Origin on POST; we treat a missing Origin/Referer
 * as suspicious unless the request comes from the same Host (SSR/loader).
 */
export const requireSameOrigin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const req = getRequest();
    const host = req.headers.get("host");
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");

    const source = origin ?? referer;
    if (!source) {
      throw new Response("Forbidden", { status: 403 });
    }
    try {
      const sourceHost = new URL(source).host;
      if (!host || sourceHost !== host) {
        throw new Response("Forbidden", { status: 403 });
      }
    } catch {
      throw new Response("Forbidden", { status: 403 });
    }
    return next();
  },
);