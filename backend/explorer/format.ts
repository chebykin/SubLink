import { USDC_DECIMALS } from "../src/config";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatUsdcAtomic(amount: string): string {
  const normalized = amount.trim();
  if (!/^[-]?[0-9]+$/.test(normalized)) {
    return normalized;
  }

  const negative = normalized.startsWith("-");
  const digits = negative ? normalized.slice(1) : normalized;
  const padded = digits.padStart(USDC_DECIMALS + 1, "0");
  const whole = padded.slice(0, -USDC_DECIMALS);
  const fraction = padded.slice(-USDC_DECIMALS).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""} USDC`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatRelativeTime(targetIso: string | null | undefined): string {
  if (!targetIso) {
    return "-";
  }

  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) {
    return targetIso;
  }

  const diffMs = target - Date.now();
  const absMs = Math.abs(diffMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1_000],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
    style: "short",
  });

  for (const [unit, size] of units) {
    if (absMs >= size || unit === "second") {
      return formatter.format(Math.round(diffMs / size), unit);
    }
  }

  return "now";
}

export function formatNextChargeLabel(params: {
  status: string;
  nextChargeAt: string | null;
}): string {
  if (
    params.status !== "pending_activation" &&
    params.status !== "active" &&
    params.status !== "past_due"
  ) {
    return "Not scheduled";
  }

  if (!params.nextChargeAt) {
    return "Not scheduled";
  }

  const target = Date.parse(params.nextChargeAt);
  if (Number.isNaN(target)) {
    return params.nextChargeAt;
  }

  const relative = formatRelativeTime(params.nextChargeAt);
  return target <= Date.now() ? `${relative} overdue` : `Due ${relative}`;
}

export function maskValue(value: string | null | undefined, options?: {
  start?: number;
  end?: number;
  preserveEmpty?: boolean;
}): string {
  if (!value) {
    return options?.preserveEmpty ? "" : "-";
  }

  const start = options?.start ?? 6;
  const end = options?.end ?? 4;
  if (value.length <= start + end + 3) {
    return `${value.slice(0, Math.max(1, Math.floor(value.length / 2)))}***`;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "primary" {
  switch (status) {
    case "active":
    case "success":
    case "processed":
    case "relayed":
      return "success";
    case "completed":
      return "primary";
    case "pending":
    case "pending_activation":
    case "past_due":
      return "warning";
    case "cancelled":
    case "cancelled_by_failure":
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}
