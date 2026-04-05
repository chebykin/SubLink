export const API_URL = import.meta.env.VITE_SUBLINK_API_URL || "/api";
export const PLAN_ID = import.meta.env.VITE_PLAN_ID || "";
export const API_KEY = import.meta.env.VITE_API_KEY || "";
export const SITE_NAME = import.meta.env.VITE_SITE_NAME || "Creator Site";
export const SUBSCRIBE_URL = import.meta.env.VITE_SUBSCRIBE_URL || "http://localhost:7000";
export const THEME_COLOR = import.meta.env.VITE_THEME_COLOR || "#8B6914";
export const THEME_MIX = import.meta.env.VITE_THEME_MIX || "#F5F0E6";

export const UNLINK_API_KEY = import.meta.env.VITE_UNLINK_API_KEY || "";
export const UNLINK_API_ENDPOINT =
  import.meta.env.VITE_UNLINK_API_ENDPOINT || "https://api.unlink.io";
export const USDC_ADDRESS =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const DEPOSIT_PERIODS = Number(
  import.meta.env.VITE_DEPOSIT_PERIODS ?? "2",
);

export const USDC_DECIMALS = 6;
export const AUTH_DOMAIN = "sublink-auth-v1";
export const AUTH_BEARER_PREFIX = "sublink-bearer-v1";
export const AUTH_PROOF_PREFIX = "sublink-subscribe-v1";
export const BEARER_TOKEN_LIFETIME_SECONDS = 86_400;
