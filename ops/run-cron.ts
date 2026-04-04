import { getAdminKeyHeader, requestJson } from "./lib/backend-api";
import {
  noopProgressLogger,
  type ProgressLogger,
} from "./lib/progress";

export async function runCron(params?: {
  log?: ProgressLogger;
}) {
  const log = params?.log ?? noopProgressLogger;
  log("Triggering backend cron run");
  const cronStartedAt = Date.now();
  const response = await requestJson<unknown>({
    method: "POST",
    path: "/admin/run-cron",
    body: {},
    headers: getAdminKeyHeader(),
  });

  log("Backend cron responded", {
    status: response.status,
    durationMs: Date.now() - cronStartedAt,
  });
  return response;
}

if (import.meta.main) {
  const { createConsoleLogger } = await import("./lib/progress");
  const result = await runCron({
    log: createConsoleLogger("run-cron"),
  });
  console.log(JSON.stringify(result, null, 2));
}
