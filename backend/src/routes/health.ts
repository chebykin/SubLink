import { jsonResponse } from "../http";

export function handleHealth(): Response {
  return jsonResponse({ ok: true });
}
