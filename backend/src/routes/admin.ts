import { getAdminSecret } from "../config";
import { errorResponse, jsonResponse } from "../http";
import { logInfo } from "../log";
import { runCronOnce } from "../services/cron";

export async function handleRunCron(request: Request): Promise<Response> {
  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return errorResponse(403, "Admin access disabled.");
  }

  const adminKey = request.headers.get("x-admin-key")?.trim();
  if (!adminKey || adminKey !== adminSecret) {
    return errorResponse(403, "Invalid admin key.");
  }

  logInfo("cron.run.triggered", {
    source: "admin_endpoint",
  });
  const summary = await runCronOnce();
  return jsonResponse(summary);
}
