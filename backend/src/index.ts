import { explorerApp } from "../explorer/app";

import {
  EXPLORER_PORT,
  SERVER_PORT,
  assertCriticalBackendEnv,
} from "./config";
import { initDatabase } from "./db";
import { logInfo } from "./log";
import { apiApp } from "./router";
import { startCronExecutor } from "./services/cron";

export function startServers(params?: {
  apiPort?: number;
  explorerPort?: number;
}) {
  const apiPort = params?.apiPort ?? SERVER_PORT;
  const explorerPort = params?.explorerPort ?? EXPLORER_PORT;

  if (apiPort === explorerPort) {
    throw new Error("PORT and EXPLORER_PORT must be different.");
  }

  assertCriticalBackendEnv();
  initDatabase();
  startCronExecutor();

  const apiServer = Bun.serve({
    port: apiPort,
    fetch(request) {
      return apiApp.fetch(request);
    },
  });

  const explorerServer = Bun.serve({
    port: explorerPort,
    fetch(request) {
      return explorerApp.fetch(request);
    },
  });

  return { apiServer, explorerServer };
}

if (import.meta.main) {
  const { apiServer, explorerServer } = startServers();
  logInfo("server.started", {
    apiPort: apiServer.port,
    apiUrl: `http://localhost:${apiServer.port}`,
    explorerPort: explorerServer.port,
    explorerUrl: `http://localhost:${explorerServer.port}`,
  });
}
