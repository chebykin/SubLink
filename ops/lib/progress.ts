export type ProgressLogger = (
  message: string,
  details?: Record<string, unknown>,
) => void;

export const noopProgressLogger: ProgressLogger = () => {};

export function createConsoleLogger(scope: string): ProgressLogger {
  return (message, details) => {
    const prefix = `[${new Date().toISOString()}] [${scope}] ${message}`;
    if (!details || Object.keys(details).length === 0) {
      console.log(prefix);
      return;
    }

    console.log(`${prefix} ${JSON.stringify(details)}`);
  };
}

export function childLogger(
  parent: ProgressLogger,
  scope: string,
): ProgressLogger {
  return (message, details) => {
    parent(`${scope}: ${message}`, details);
  };
}

export function startHeartbeat(params: {
  log: ProgressLogger;
  message: string;
  details?: Record<string, unknown>;
  intervalMs?: number;
}): () => void {
  const intervalMs = params.intervalMs ?? 15_000;
  const timer = setInterval(() => {
    params.log(params.message, params.details);
  }, intervalMs);

  return () => clearInterval(timer);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
