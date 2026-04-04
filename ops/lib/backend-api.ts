import { getRequiredEnv } from "./unlink-helpers";

export function getSublinkApiUrl(): string {
  return Bun.env.SUBLINK_API_URL?.trim() || "http://localhost:3000";
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error(`Expected JSON response body (status=${response.status}).`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response body: ${text}`);
  }
}

export async function requestJson<T>(params: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<{ status: number; body: T }> {
  const response = await fetch(`${getSublinkApiUrl()}${params.path}`, {
    method: params.method,
    headers: {
      "content-type": "application/json",
      ...(params.headers ?? {}),
    },
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  });

  const body = await readJsonResponse<T>(response);
  return { status: response.status, body };
}

export function getRequiredApiKeyEnv(): string {
  return getRequiredEnv("CREATOR_API_KEY");
}

export function getAdminKeyHeader(): Record<string, string> {
  const adminSecret = Bun.env.ADMIN_SECRET?.trim();
  if (!adminSecret) {
    return {};
  }

  return {
    "x-admin-key": adminSecret,
  };
}
