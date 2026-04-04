import {
  escapeHtml,
  formatCount,
  formatDateTime,
  formatNextChargeLabel,
  formatRelativeTime,
  formatUsdcAtomic,
  maskValue,
  statusTone,
} from "./format";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/creators", label: "Creators" },
  { href: "/plans", label: "Plans" },
  { href: "/auth-keys", label: "Auth Keys" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/charges", label: "Charges" },
];

function navLink(href: string, label: string, activePath: string): string {
  const active = activePath === href || (href !== "/" && activePath.startsWith(`${href}/`));
  return `<a href="${href}" class="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${
    active
      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
      : "bg-white/70 text-slate-700 ring-1 ring-slate-200 hover:bg-white"
  }">${escapeHtml(label)}</a>`;
}

export function renderLayout(params: {
  title: string;
  activePath: string;
  content: string;
  subtitle?: string;
}): string {
  const nav = NAV_ITEMS.map((item) => navLink(item.href, item.label, params.activePath)).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(params.title)} · SubLink Explorer</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/light.css"
    />
    <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/shoelace-autoloader.js"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ["Instrument Sans", "ui-sans-serif", "system-ui", "sans-serif"],
            },
            boxShadow: {
              glow: "0 24px 60px -24px rgba(15, 23, 42, 0.25)",
            },
          },
        },
      };
    </script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');
      :root {
        color-scheme: light;
      }
      body {
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 32%),
          radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 28%),
          linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      }
      sl-card::part(base) {
        border-radius: 1.25rem;
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 24px 60px -24px rgba(15, 23, 42, 0.16);
      }
      sl-badge::part(base) {
        border-radius: 999px;
      }
      sl-details::part(base) {
        border-radius: 1rem;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(255, 255, 255, 0.84);
      }
    </style>
  </head>
  <body class="text-slate-900 antialiased">
    <div class="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 p-6 shadow-glow backdrop-blur xl:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
              SubLink Admin Explorer
            </div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">${escapeHtml(params.title)}</h1>
            <p class="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">${escapeHtml(
              params.subtitle ?? "Read-only hackathon ops console for creators, auth keys, subscriptions, charges, and live Unlink state.",
            )}</p>
          </div>
          <div class="flex flex-wrap gap-2">${nav}</div>
        </div>
      </header>
      <main class="space-y-6">${params.content}</main>
    </div>
  </body>
</html>`;
}

export function renderMetricCard(params: {
  label: string;
  value: string;
  hint?: string;
}): string {
  return `<sl-card>
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">${escapeHtml(params.label)}</p>
      <p class="text-3xl font-semibold tracking-tight text-slate-950">${escapeHtml(params.value)}</p>
      <p class="text-sm text-slate-500">${escapeHtml(params.hint ?? "")}</p>
    </div>
  </sl-card>`;
}

export function renderSection(title: string, body: string, options?: { subtitle?: string; actions?: string }): string {
  return `<section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-slate-950">${escapeHtml(title)}</h2>
        ${options?.subtitle ? `<p class="mt-1 text-sm text-slate-500">${escapeHtml(options.subtitle)}</p>` : ""}
      </div>
      ${options?.actions ? `<div class="flex flex-wrap gap-2">${options.actions}</div>` : ""}
    </div>
    ${body}
  </section>`;
}

export function renderInfoGrid(items: Array<{ label: string; value: string; mono?: boolean }>): string {
  const content = items
    .map(
      (item) => `<div class="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${escapeHtml(item.label)}</p>
        <p class="mt-2 break-all text-sm ${item.mono ? "font-mono text-[13px]" : ""} text-slate-900">${escapeHtml(item.value)}</p>
      </div>`,
    )
    .join("");
  return `<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">${content}</div>`;
}

export function renderStatusBadge(status: string): string {
  return `<sl-badge variant="${statusTone(status)}" pill>${escapeHtml(status)}</sl-badge>`;
}

export function renderLink(href: string, label: string, options?: { mono?: boolean }): string {
  return `<a href="${href}" class="${options?.mono ? "font-mono text-[13px]" : ""} text-sky-700 hover:text-sky-900 hover:underline">${escapeHtml(label)}</a>`;
}

export function renderTable(params: {
  columns: string[];
  rows: string[][];
  emptyLabel: string;
}): string {
  if (params.rows.length === 0) {
    return renderEmpty(params.emptyLabel);
  }

  const header = params.columns
    .map((column) => `<th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${escapeHtml(column)}</th>`)
    .join("");
  const body = params.rows
    .map(
      (row) => `<tr class="border-t border-slate-200/80">${row
        .map((cell) => `<td class="px-4 py-3 align-top text-sm text-slate-700">${cell}</td>`)
        .join("")}</tr>`,
    )
    .join("");

  return `<div class="overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/80 shadow-glow backdrop-blur">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse">
        <thead class="bg-slate-50/80"><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </div>`;
}

export function renderEmpty(message: string): string {
  return `<div class="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">${escapeHtml(message)}</div>`;
}

export function renderPillLink(href: string, label: string): string {
  return `<a href="${href}" class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-800">${escapeHtml(label)}</a>`;
}

export function renderLiveTransactionDetails(rawJson: string): string {
  return `<sl-details summary="Raw payload">
    <pre class="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-100">${escapeHtml(rawJson)}</pre>
  </sl-details>`;
}

export function renderSubtleList(items: string[]): string {
  if (items.length === 0) {
    return renderEmpty("Nothing to show yet.");
  }

  return `<div class="flex flex-wrap gap-2">${items.join("")}</div>`;
}

export function asMetric(value: number | string): string {
  return typeof value === "number" ? formatCount(value) : value;
}

export const fmt = {
  formatCount,
  formatDateTime,
  formatNextChargeLabel,
  formatRelativeTime,
  formatUsdcAtomic,
  maskValue,
};
