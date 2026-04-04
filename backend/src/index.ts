import { SERVER_PORT } from "./config";
import { initDatabase } from "./db";
import { handleRequest } from "./router";
import { startCronExecutor } from "./services/cron";

export function startServer(port = SERVER_PORT) {
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
  console.log(`Backend listening on http://localhost:${server.port}`);
}
