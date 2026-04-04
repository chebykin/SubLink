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

export async function logRejectedHttpResponse(params: {
  scope: "api" | "explorer";
  method: string;
  pathname: string;
  startedAt: number;
  response: Response;
}): Promise<Response> {
  if (params.response.status < 400) {
    return params.response;
  }

  const durationMs = Date.now() - params.startedAt;
  const contentType = params.response.headers.get("content-type") ?? "";
  let bodyText: string | undefined;

  if (
    contentType.includes("application/json") ||
    contentType.startsWith("text/plain")
  ) {
    try {
      bodyText = await params.response.clone().text();
      if (bodyText.length > 400) {
        bodyText = `${bodyText.slice(0, 397)}...`;
      }
    } catch {
      bodyText = undefined;
    }
  }

  const details = {
    method: params.method,
    pathname: params.pathname,
    status: params.response.status,
    durationMs,
    ...(bodyText === undefined ? {} : { body: bodyText }),
  };

  if (params.response.status >= 500) {
    logError(`${params.scope}.request.rejected`, details);
  } else {
    logWarn(`${params.scope}.request.rejected`, details);
  }

  return params.response;
}
