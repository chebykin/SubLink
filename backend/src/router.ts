import { handleRunCron } from "./routes/admin";
import { handleGetCharges } from "./routes/charges";
import { handleCreateCreator, handleGetCreator } from "./routes/creators";
import { handleHealth } from "./routes/health";
import { handleCreatePlan, handleGetPlan, handleListPlans } from "./routes/plans";
import {
  handleCancelSubscription,
  handleListSubscriptions,
  handleSubscribe,
} from "./routes/subscriptions";
import { handleVerify } from "./routes/verify";
import { HttpError, errorResponse } from "./http";
import { logError, logWarn } from "./log";

function matchPath(pathname: string, pattern: RegExp): string[] | null {
  const match = pathname.match(pattern);
  if (!match) {
    return null;
  }
  return match.slice(1).map((value) => decodeURIComponent(value));
}

export async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method.toUpperCase();
  const startedAt = Date.now();

  async function logRejectedResponse(response: Response): Promise<Response> {
    if (response.status < 400) {
      return response;
    }

    const durationMs = Date.now() - startedAt;
    let bodyText: string | undefined;

    try {
      bodyText = await response.clone().text();
    } catch {
      bodyText = undefined;
    }

    const details = {
      method,
      pathname,
      status: response.status,
      durationMs,
      body: bodyText,
    };

    if (response.status >= 500) {
      logError("http.request.rejected", details);
    } else {
      logWarn("http.request.rejected", details);
    }

    return response;
  }

  try {
    // Public: no user data
    if (method === "GET" && pathname === "/health") {
      return logRejectedResponse(handleHealth());
    }

    // Public: open registration (no creator auth implemented yet)
    if (method === "POST" && pathname === "/creators") {
      return logRejectedResponse(await handleCreateCreator(request));
    }

    // Public: returns name + unlink address, no apiKey
    if (method === "GET") {
      const creatorMatch = matchPath(pathname, /^\/creators\/([^/]+)$/);
      if (creatorMatch) {
        const [creatorId] = creatorMatch;
        if (creatorId) {
          return logRejectedResponse(handleGetCreator(creatorId));
        }
      }
    }

    // Public: creators create plans without auth (no creator auth implemented yet)
    if (method === "POST" && pathname === "/plans") {
      return logRejectedResponse(await handleCreatePlan(request));
    }

    // Public: plan discovery for subscribers
    if (method === "GET" && pathname === "/plans") {
      return logRejectedResponse(handleListPlans(request));
    }

    // Public: includes creator unlink address needed for subscribe flow
    if (method === "GET") {
      const planMatch = matchPath(pathname, /^\/plans\/([^/]+)$/);
      if (planMatch) {
        const [planId] = planMatch;
        if (planId) {
          return logRejectedResponse(handleGetPlan(planId));
        }
      }
    }

    // Sensitive input: receives spending keys over HTTPS, keys stripped from all responses
    if (method === "POST" && pathname === "/subscribe") {
      return logRejectedResponse(await handleSubscribe(request));
    }

    // Bearer-gated: only returns caller's own subscriptions, keys stripped
    if (method === "GET" && pathname === "/subscriptions") {
      return logRejectedResponse(await handleListSubscriptions(request));
    }

    // Bearer-gated + owner check: prevents cancelling others' subscriptions
    if (method === "DELETE") {
      const subscriptionMatch = matchPath(pathname, /^\/subscriptions\/([^/]+)$/);
      if (subscriptionMatch) {
        const [subscriptionId] = subscriptionMatch;
        if (subscriptionId) {
          return logRejectedResponse(
            await handleCancelSubscription(subscriptionId, request),
          );
        }
      }
    }

    // Bearer-gated + owner check: charge history reveals payment timing/amounts
    if (method === "GET") {
      const chargesMatch = matchPath(pathname, /^\/charges\/([^/]+)$/);
      if (chargesMatch) {
        const [subscriptionId] = chargesMatch;
        if (subscriptionId) {
          return logRejectedResponse(
            await handleGetCharges(subscriptionId, request),
          );
        }
      }
    }

    // Admin key required: manual trigger on top of the already-running setInterval loop
    if (method === "POST" && pathname === "/admin/run-cron") {
      return logRejectedResponse(await handleRunCron(request));
    }

    // Creator API key required: reveals if a subscriber is active for a plan
    if (method === "GET") {
      const verifyMatch = matchPath(pathname, /^\/verify\/([^/]+)$/);
      if (verifyMatch) {
        const [planId] = verifyMatch;
        if (planId) {
          return logRejectedResponse(await handleVerify(planId, request));
        }
      }
    }

    return logRejectedResponse(errorResponse(404, "Route not found."));
  } catch (error) {
    if (error instanceof HttpError) {
      return logRejectedResponse(
        errorResponse(error.status, error.message, error.details),
      );
    }

    return logRejectedResponse(
      errorResponse(
        500,
        error instanceof Error ? error.message : "Unexpected server error.",
      ),
    );
  }
}
