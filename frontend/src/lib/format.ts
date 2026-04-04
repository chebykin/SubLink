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

export function truncateAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
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

export function relativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diff = now - then;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const prefix = future ? "in " : "";
  const suffix = future ? "" : " ago";

  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return `${prefix}${m}m${suffix}`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return `${prefix}${h}h${suffix}`;
  }
  const d = Math.round(abs / 86_400_000);
  return `${prefix}${d}d${suffix}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
