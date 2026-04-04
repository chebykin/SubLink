import { getSublinkApiUrl, readJsonResponse } from "./lib/backend-api";
import {
  noopProgressLogger,
  type ProgressLogger,
} from "./lib/progress";
import { getRequiredEnv } from "./lib/unlink-helpers";

export async function verifyAccess(params?: {
  planId?: string;
  bearerToken?: string;
  apiKey?: string;
  log?: ProgressLogger;
}) {
  const planId = params?.planId ?? getRequiredEnv("PLAN_ID");
  const bearerToken = params?.bearerToken ?? getRequiredEnv("BEARER_TOKEN");
  const apiKey = params?.apiKey ?? getRequiredEnv("CREATOR_API_KEY");
  const log = params?.log ?? noopProgressLogger;

  log("Calling verify endpoint", {
    planId,
    sublinkApiUrl: getSublinkApiUrl(),
  });
  const verifyStartedAt = Date.now();

  const response = await fetch(
    `${getSublinkApiUrl()}/verify/${encodeURIComponent(planId)}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${bearerToken}`,
        "x-api-key": apiKey,
      },
    },
  );

  const body = await readJsonResponse<unknown>(response);
  log("Verify endpoint responded", {
    status: response.status,
    durationMs: Date.now() - verifyStartedAt,
  });
  return {
    status: response.status,
    body,
  };
}

if (import.meta.main) {
  const { createConsoleLogger } = await import("./lib/progress");
  const result = await verifyAccess({
    log: createConsoleLogger("verify-access"),
  });
  console.log(JSON.stringify(result, null, 2));
}
