import { assertCriticalBackendEnv, SERVER_PORT } from "./config";
import { initDatabase } from "./db";
import { logInfo } from "./log";
import { handleRequest } from "./router";
import { startCronExecutor } from "./services/cron";

export function startServer(port = SERVER_PORT) {
  assertCriticalBackendEnv();
  initDatabase();
  startCronExecutor();

  return Bun.serve({
    port,
    fetch(request) {
      return handleRequest(request);
    },
  });
}

if (import.meta.main) {
  const server = startServer();
  logInfo("server.started", {
    port: server.port,
    url: `http://localhost:${server.port}`,
  });
}
