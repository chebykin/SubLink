import { USDC_DECIMALS } from "./constants";

export function formatUsdc(atomicUnits: string): string {
  const n = BigInt(atomicUnits);
  const divisor = BigInt(10 ** USDC_DECIMALS);
  const whole = n / divisor;
  const frac = n % divisor;
  const fracStr = frac.toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function formatUsdcDisplay(atomicUnits: string): string {
  return `${formatUsdc(atomicUnits)} USDC`;
}

export function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  const days = Math.round(seconds / 86400);
  if (days === 30 || days === 31) return "monthly";
  if (days === 7) return "weekly";
  if (days === 365 || days === 366) return "yearly";
  return `${days}d`;
}
