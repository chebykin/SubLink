type LogLevel = "info" | "warn" | "error";

function logsEnabled(): boolean {
  return Bun.env.SUPPRESS_BACKEND_LOGS !== "1";
}

function safeStringify(details: Record<string, unknown>): string {
  return JSON.stringify(details, (_key, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
      };
    }

    return value;
  });
}

function emit(
  level: LogLevel,
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!logsEnabled()) {
    return;
  }

  const prefix = `[${new Date().toISOString()}] [backend] ${event}`;
  const line =
    details && Object.keys(details).length > 0
      ? `${prefix} ${safeStringify(details)}`
      : prefix;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(event: string, details?: Record<string, unknown>): void {
  emit("info", event, details);
}

export function logWarn(event: string, details?: Record<string, unknown>): void {
  emit("warn", event, details);
}

export function logError(event: string, details?: Record<string, unknown>): void {
  emit("error", event, details);
}
