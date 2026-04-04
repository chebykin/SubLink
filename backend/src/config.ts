function readOptionalEnv(name: string): string | undefined {
  const value = Bun.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readNumberEnv(name: string, fallback: number): number {
  const value = readOptionalEnv(name);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: expected a positive number.`);
  }
  return parsed;
}

export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const USDC_DECIMALS = 6 as const;
export const CHAIN_ID = 84532 as const;
export const RPC_URL = "https://sepolia.base.org" as const;
export const AUTH_PROOF_PREFIX = "sublink-subscribe-v1" as const;
export const AUTH_BEARER_PREFIX = "sublink-bearer-v1" as const;

export const CRON_INTERVAL_MS = readNumberEnv("CRON_INTERVAL_MS", 60_000);
export const MAX_CONSECUTIVE_FAILURES = readNumberEnv(
  "MAX_CONSECUTIVE_FAILURES",
  3,
);

export const BEARER_TOKEN_MAX_AGE_SECONDS = readNumberEnv(
  "BEARER_TOKEN_MAX_AGE_SECONDS",
  86_400,
);
export const BEARER_TOKEN_CLOCK_SKEW_SECONDS = readNumberEnv(
  "BEARER_TOKEN_CLOCK_SKEW_SECONDS",
  30,
);

const defaultDbPath = new URL("../data/sublink.db", import.meta.url).pathname;
export const DB_PATH = readOptionalEnv("DB_PATH") ?? defaultDbPath;

export const SERVER_PORT = readNumberEnv("PORT", 3000);
export const SUBLINK_API_URL =
  readOptionalEnv("SUBLINK_API_URL") ?? `http://localhost:${SERVER_PORT}`;

export const UNLINK_API_KEY = readOptionalEnv("UNLINK_API_KEY");
export const UNLINK_API_ENDPOINT = readOptionalEnv("UNLINK_API_ENDPOINT");
export const ADMIN_SECRET = readOptionalEnv("ADMIN_SECRET");
export function getAdminSecret(): string | undefined {
  return readOptionalEnv("ADMIN_SECRET");
}

export function assertCriticalBackendEnv(): void {
  const required = ["UNLINK_API_KEY", "UNLINK_API_ENDPOINT"] as const;
  const missing = required.filter((name) => !readOptionalEnv(name));

  if (missing.length > 0) {
    throw new Error(
      `Missing required backend environment variable(s): ${missing.join(", ")}`,
    );
  }
}

export const POLL_INTERVAL_MS = readNumberEnv("UNLINK_POLL_INTERVAL_MS", 3_000);
export const POLL_TIMEOUT_MS = readNumberEnv("UNLINK_POLL_TIMEOUT_MS", 180_000);
