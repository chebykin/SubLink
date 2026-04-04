export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function errorResponse(
  status: number,
  error: string,
  details?: unknown,
): Response {
  return jsonResponse(
    {
      error,
      ...(details === undefined ? {} : { details }),
    },
    status,
  );
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    const value = (await request.json()) as T;
    return value;
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

export function requireString(
  input: unknown,
  fieldName: string,
  options?: { allowEmpty?: boolean },
): string {
  if (typeof input !== "string") {
    throw new HttpError(400, `Field '${fieldName}' must be a string.`);
  }

  const trimmed = input.trim();
  if (!options?.allowEmpty && trimmed.length === 0) {
    throw new HttpError(400, `Field '${fieldName}' is required.`);
  }

  return trimmed;
}

export function requireInteger(
  input: unknown,
  fieldName: string,
  options?: { min?: number },
): number {
  if (typeof input !== "number" || !Number.isInteger(input)) {
    throw new HttpError(400, `Field '${fieldName}' must be an integer.`);
  }

  if (options?.min !== undefined && input < options.min) {
    throw new HttpError(
      400,
      `Field '${fieldName}' must be at least ${options.min}.`,
    );
  }

  return input;
}

export function optionalString(input: unknown): string | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (typeof input !== "string") {
    throw new HttpError(400, "Optional field must be a string.");
  }
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addSecondsToIso(baseIso: string, seconds: number): string {
  const timestamp = Date.parse(baseIso);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid ISO timestamp: ${baseIso}`);
  }
  return new Date(timestamp + seconds * 1_000).toISOString();
}

export function addMsToIso(baseIso: string, ms: number): string {
  const timestamp = Date.parse(baseIso);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid ISO timestamp: ${baseIso}`);
  }
  return new Date(timestamp + ms).toISOString();
}

export function randomHex(bytesLength: number): string {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
