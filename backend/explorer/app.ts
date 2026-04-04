import { Hono } from "hono";

import { logRejectedHttpResponse } from "../src/log";
import {
  getChargeDetail,
  getCreatorDetail,
  getDashboardSnapshot,
  getPlanDetail,
  getSubscriberDetail,
  getSubscriptionDetail,
  listCharges,
  listCreators,
  listPlans,
  listSubscribers,
  listSubscriptions,
  type ExplorerChargeSummary,
  type ExplorerSubscriptionSummary,
} from "./queries";
import { readLiveSubscriptionSnapshot } from "./live-unlink";
import {
  asMetric,
  fmt,
  renderEmpty,
  renderInfoGrid,
  renderLayout,
  renderLink,
  renderLiveTransactionDetails,
  renderMetricCard,
  renderPillLink,
  renderSection,
  renderStatusBadge,
  renderSubtleList,
  renderTable,
} from "./layout";
import { escapeHtml } from "./format";

const SUBSCRIPTION_STATUSES = [
  "all",
  "pending_activation",
  "active",
  "past_due",
  "cancelled",
  "cancelled_by_failure",
  "completed",
] as const;
const CHARGE_STATUSES = ["all", "pending", "success", "failed"] as const;

type SubscriptionStatusFilter = (typeof SUBSCRIPTION_STATUSES)[number];
type ChargeStatusFilter = (typeof CHARGE_STATUSES)[number];

function authKeyHref(authKeyId: string): string {
  return `/auth-keys/${authKeyId}`;
}

function statusOptions<T extends readonly string[]>(
  values: T,
  selected: string,
): string {
  return values
    .map(
      (value) => `<option value="${value}" ${selected === value ? "selected" : ""}>${value}</option>`,
    )
    .join("");
}

function textInput(name: string, value: string | undefined, label: string): string {
  return `<label class="flex flex-col gap-2 text-sm text-slate-600">
    <span class="font-medium text-slate-700">${escapeHtml(label)}</span>
    <input name="${escapeHtml(name)}" value="${escapeHtml(value ?? "")}" class="rounded-2xl border-slate-200 bg-white/80 text-sm" />
  </label>`;
}

function selectInput(name: string, label: string, optionsHtml: string): string {
  return `<label class="flex flex-col gap-2 text-sm text-slate-600">
    <span class="font-medium text-slate-700">${escapeHtml(label)}</span>
    <select name="${escapeHtml(name)}" class="rounded-2xl border-slate-200 bg-white/80 text-sm">${optionsHtml}</select>
  </label>`;
}

function renderNotFoundPage(title: string, message: string, activePath: string): Response {
  return new Response(
    renderLayout({
      title,
      activePath,
      content: renderEmpty(message),
    }),
    {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}

function renderSummaryCards(cards: string[]): string {
  return `<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">${cards.join("")}</div>`;
}

function subscriptionRow(subscription: ExplorerSubscriptionSummary): string[] {
  return [
    renderLink(`/subscriptions/${subscription.id}`, subscription.id, { mono: true }),
    `${renderLink(`/plans/${subscription.planId}`, subscription.planName)}<div class="mt-1 text-xs text-slate-500">${renderLink(`/creators/${subscription.creatorId}`, subscription.creatorName)}</div>`,
    `${renderLink(authKeyHref(subscription.authKeyId), subscription.authKeyId, { mono: true })}<div class="mt-1 text-xs text-slate-500">${fmt.maskValue(subscription.authPublicKey, { start: 10, end: 8 })}</div>`,
    `${renderStatusBadge(subscription.status)}<div class="mt-2 text-xs text-slate-500">${fmt.formatNextChargeLabel({
      status: subscription.status,
      nextChargeAt: subscription.nextChargeAt,
    })}</div>`,
    `${fmt.formatUsdcAtomic(subscription.totalSpent)}<div class="mt-1 text-xs text-slate-500">${subscription.chargeCount} charges</div>`,
    `${fmt.formatDateTime(subscription.nextChargeAt)}<div class="mt-1 text-xs text-slate-500">${fmt.formatRelativeTime(subscription.nextChargeAt)}</div>`,
  ];
}

function chargeRow(charge: ExplorerChargeSummary): string[] {
  return [
    renderLink(`/charges/${charge.id}`, charge.id, { mono: true }),
    `${renderStatusBadge(charge.status)}${charge.unlinkTxId ? `<div class="mt-2 text-xs text-slate-500 font-mono break-all">${charge.unlinkTxId}</div>` : ""}`,
    `${fmt.formatUsdcAtomic(charge.amount)}<div class="mt-1 text-xs text-slate-500">${renderLink(`/subscriptions/${charge.subscriptionId}`, charge.subscriptionId, { mono: true })}</div>`,
    `${renderLink(`/plans/${charge.planId}`, charge.planName)}<div class="mt-1 text-xs text-slate-500">${renderLink(`/creators/${charge.creatorId}`, charge.creatorName)}</div>`,
    `${fmt.formatDateTime(charge.createdAt)}<div class="mt-1 text-xs text-slate-500">${fmt.formatRelativeTime(charge.createdAt)}</div>`,
  ];
}

function creatorRow(creator: ReturnType<typeof listCreators>[number]): string[] {
  return [
    `${renderLink(`/creators/${creator.id}`, creator.name)}<div class="mt-1 text-xs text-slate-500 font-mono break-all">${creator.id}</div>`,
    `<div class="space-y-1"><div class="font-mono text-[13px] text-slate-700 break-all">${creator.evmAddress}</div><div class="font-mono text-[13px] text-slate-500 break-all">${creator.unlinkAddress}</div></div>`,
    `${creator.planCount} plans<div class="mt-1 text-xs text-slate-500">${creator.activeSubscriptionCount} active subscriptions</div>`,
    `${fmt.formatUsdcAtomic(creator.totalCharged)}<div class="mt-1 text-xs text-slate-500">${creator.chargeCount} charges</div>`,
    `${creator.apiKeyMasked}<div class="mt-1 text-xs text-slate-500">API key masked</div>`,
  ];
}

function planRow(plan: ReturnType<typeof listPlans>[number]): string[] {
  return [
    `${renderLink(`/plans/${plan.id}`, plan.name)}<div class="mt-1 text-xs text-slate-500 font-mono break-all">${plan.id}</div>`,
    `${renderLink(`/creators/${plan.creatorId}`, plan.creatorName)}<div class="mt-1 text-xs text-slate-500 font-mono break-all">${plan.creatorUnlinkAddress}</div>`,
    `${fmt.formatUsdcAtomic(plan.amount)}<div class="mt-1 text-xs text-slate-500">Every ${plan.intervalSeconds}s</div>`,
    `${renderStatusBadge(plan.active ? "active" : "inactive")}<div class="mt-2 text-xs text-slate-500">${plan.activeSubscriptionCount} active / ${plan.subscriptionCount} total</div>`,
    `${plan.nextChargeAt ? fmt.formatDateTime(plan.nextChargeAt) : "-"}<div class="mt-1 text-xs text-slate-500">${plan.nextChargeAt ? fmt.formatRelativeTime(plan.nextChargeAt) : "No active subscriptions"}</div>`,
  ];
}

function subscriberRow(subscriber: ReturnType<typeof listSubscribers>[number]): string[] {
  return [
    `${renderLink(authKeyHref(subscriber.authKeyId), subscriber.authKeyId, { mono: true })}<div class="mt-1 text-xs text-slate-500">${fmt.maskValue(subscriber.authPublicKey, { start: 12, end: 10 })}</div>`,
    `${subscriber.activeSubscriptionCount} active<div class="mt-1 text-xs text-slate-500">${subscriber.subscriptionCount} total subscriptions</div>`,
    `${subscriber.creatorCount} creators<div class="mt-1 text-xs text-slate-500">${subscriber.planCount} plans</div>`,
    `${fmt.formatUsdcAtomic(subscriber.totalSpent)}<div class="mt-1 text-xs text-slate-500">Last charge ${fmt.formatDateTime(subscriber.lastChargedAt)}</div>`,
  ];
}

function dashboardPage(): string {
  const snapshot = getDashboardSnapshot();

  return renderLayout({
    title: "Dashboard",
    activePath: "/",
    content: [
      renderSummaryCards([
        renderMetricCard({ label: "Creators", value: asMetric(snapshot.creatorCount), hint: "Operators registered in SQLite" }),
        renderMetricCard({ label: "Plans", value: asMetric(snapshot.planCount), hint: "Recurring products configured" }),
        renderMetricCard({ label: "Auth Keys", value: asMetric(snapshot.subscriberCount), hint: "Grouped auth identities" }),
        renderMetricCard({ label: "Subscriptions", value: asMetric(snapshot.subscriptionCount), hint: `${snapshot.activeSubscriptionCount} active` }),
        renderMetricCard({ label: "Charges", value: asMetric(snapshot.chargeCount), hint: `${snapshot.successfulChargeCount} success / ${snapshot.failedChargeCount} failed` }),
        renderMetricCard({ label: "Total charged", value: fmt.formatUsdcAtomic(snapshot.totalCharged), hint: "Successful charges only" }),
        renderMetricCard({ label: "Due now", value: asMetric(snapshot.dueNowCount), hint: "Active subscriptions already overdue" }),
        renderMetricCard({ label: "Stopped", value: asMetric(snapshot.completedSubscriptionCount + snapshot.cancelledSubscriptionCount), hint: "Completed or cancelled subscriptions" }),
      ]),
      renderSection(
        "Upcoming Charges",
        renderTable({
          columns: ["Subscription", "Plan / Creator", "Auth Key", "Status", "Spent", "Next charge"],
          rows: snapshot.upcomingSubscriptions.map(subscriptionRow),
          emptyLabel: "No active subscriptions yet.",
        }),
        {
          actions: renderPillLink("/subscriptions?status=active", "View active subscriptions"),
          subtitle: "Soonest due subscriptions across all creators.",
        },
      ),
      renderSection(
        "Recent Charges",
        renderTable({
          columns: ["Charge", "Status", "Amount / Subscription", "Plan / Creator", "Created"],
          rows: snapshot.recentCharges.map(chargeRow),
          emptyLabel: "Charges will appear here after the first collection.",
        }),
        {
          actions: renderPillLink("/charges", "Open charge ledger"),
        },
      ),
      renderSection(
        "Subscriptions Requiring Attention",
        renderTable({
          columns: ["Subscription", "Plan / Creator", "Auth Key", "Status", "Spent", "Next charge"],
          rows: snapshot.failingSubscriptions.map(subscriptionRow),
          emptyLabel: "No failing or degraded subscriptions right now.",
        }),
      ),
      renderSection(
        "Newest Subscriptions",
        renderTable({
          columns: ["Subscription", "Plan / Creator", "Auth Key", "Status", "Spent", "Next charge"],
          rows: snapshot.recentSubscriptions.map(subscriptionRow),
          emptyLabel: "No subscriptions yet.",
        }),
      ),
    ].join(""),
  });
}

function creatorsPage(): string {
  const creators = listCreators();
  return renderLayout({
    title: "Creators",
    activePath: "/creators",
    content: renderSection(
      "All Creators",
      renderTable({
        columns: ["Creator", "Addresses", "Plans / Subs", "Total charged", "API key"],
        rows: creators.map(creatorRow),
        emptyLabel: "Create a creator from the API to populate this table.",
      }),
      {
        subtitle: "Read-only view over creator records, linked plans, and aggregate billing state.",
      },
    ),
  });
}

function creatorDetailPage(creatorId: string): string | null {
  const detail = getCreatorDetail(creatorId);
  if (!detail) {
    return null;
  }

  return renderLayout({
    title: detail.creator.name,
    activePath: "/creators",
    subtitle: "Creator detail with linked plans, subscriptions, and charges.",
    content: [
      renderSummaryCards([
        renderMetricCard({ label: "Plans", value: asMetric(detail.creator.planCount), hint: `${detail.creator.activePlanCount} active` }),
        renderMetricCard({ label: "Subscriptions", value: asMetric(detail.creator.subscriptionCount), hint: `${detail.creator.activeSubscriptionCount} active` }),
        renderMetricCard({ label: "Charges", value: asMetric(detail.creator.chargeCount), hint: "All statuses" }),
        renderMetricCard({ label: "Total charged", value: fmt.formatUsdcAtomic(detail.creator.totalCharged), hint: "Successful charges" }),
      ]),
      renderSection(
        "Creator Record",
        renderInfoGrid([
          { label: "Creator ID", value: detail.creator.id, mono: true },
          { label: "EVM Address", value: detail.creator.evmAddress, mono: true },
          { label: "Unlink Address", value: detail.creator.unlinkAddress, mono: true },
          { label: "Webhook URL", value: detail.creator.webhookUrl ?? "-" },
          { label: "API Key", value: detail.creator.apiKeyMasked },
          { label: "Created", value: fmt.formatDateTime(detail.creator.createdAt) },
        ]),
      ),
      renderSection(
        "Plans",
        renderTable({
          columns: ["Plan", "Creator", "Price", "Status", "Next charge"],
          rows: detail.plans.map(planRow),
          emptyLabel: "This creator has no plans yet.",
        }),
      ),
      renderSection(
        "Subscriptions",
        renderTable({
          columns: ["Subscription", "Plan / Creator", "Auth Key", "Status", "Spent", "Next charge"],
          rows: detail.subscriptions.map(subscriptionRow),
          emptyLabel: "No subscriptions for this creator yet.",
        }),
      ),
      renderSection(
        "Charges",
        renderTable({
          columns: ["Charge", "Status", "Amount / Subscription", "Plan / Creator", "Created"],
          rows: detail.charges.map(chargeRow),
          emptyLabel: "No charges recorded for this creator yet.",
        }),
      ),
    ].join(""),
  });
}

function plansPage(): string {
  const plans = listPlans();
  return renderLayout({
    title: "Plans",
    activePath: "/plans",
    content: renderSection(
      "All Plans",
      renderTable({
        columns: ["Plan", "Creator", "Price", "Status", "Next charge"],
        rows: plans.map(planRow),
        emptyLabel: "No plans yet.",
      }),
      {
        subtitle: "Recurring products with creator linkage and billing aggregates.",
      },
    ),
  });
}

function planDetailPage(planId: string): string | null {
  const detail = getPlanDetail(planId);
  if (!detail) {
    return null;
  }

  return renderLayout({
    title: detail.plan.name,
    activePath: "/plans",
    subtitle: detail.plan.description || "Plan detail with active billing relations.",
    content: [
      renderSummaryCards([
        renderMetricCard({ label: "Price", value: fmt.formatUsdcAtomic(detail.plan.amount), hint: `Every ${detail.plan.intervalSeconds}s` }),
        renderMetricCard({ label: "Subscriptions", value: asMetric(detail.plan.subscriptionCount), hint: `${detail.plan.activeSubscriptionCount} active` }),
        renderMetricCard({ label: "Charges", value: asMetric(detail.plan.chargeCount), hint: "All statuses" }),
        renderMetricCard({ label: "Total charged", value: fmt.formatUsdcAtomic(detail.plan.totalCharged), hint: "Successful charges" }),
      ]),
      renderSection(
        "Plan Record",
        renderInfoGrid([
          { label: "Plan ID", value: detail.plan.id, mono: true },
          { label: "Creator", value: `${detail.creator.name} (${detail.creator.id})` },
          { label: "Creator Unlink", value: detail.plan.creatorUnlinkAddress, mono: true },
          { label: "Spending cap", value: detail.plan.spendingCap === "0" ? "Unlimited" : fmt.formatUsdcAtomic(detail.plan.spendingCap) },
          { label: "Active", value: detail.plan.active ? "Yes" : "No" },
          { label: "Created", value: fmt.formatDateTime(detail.plan.createdAt) },
        ]),
        {
          actions: renderPillLink(`/creators/${detail.creator.id}`, "Open creator"),
        },
      ),
      renderSection(
        "Subscriptions",
        renderTable({
          columns: ["Subscription", "Plan / Creator", "Auth Key", "Status", "Spent", "Next charge"],
          rows: detail.subscriptions.map(subscriptionRow),
          emptyLabel: "No subscriptions for this plan yet.",
        }),
      ),
      renderSection(
        "Charges",
        renderTable({
          columns: ["Charge", "Status", "Amount / Subscription", "Plan / Creator", "Created"],
          rows: detail.charges.map(chargeRow),
          emptyLabel: "No charges for this plan yet.",
        }),
      ),
    ].join(""),
  });
}

function subscribersPage(): string {
  const subscribers = listSubscribers();
  return renderLayout({
    title: "Auth Keys",
    activePath: "/auth-keys",
    content: renderSection(
      "Grouped Auth Keys",
      renderTable({
        columns: ["Auth key", "Subscriptions", "Coverage", "Total spent"],
        rows: subscribers.map(subscriberRow),
        emptyLabel: "Auth keys will appear after the first subscription is created.",
      }),
      {
        subtitle: "Auth keys are grouped identities used for subscriber authorization. They are not the main wallet address or the dedicated Unlink account address.",
      },
    ),
  });
}

function subscriberDetailPage(authKeyId: string): string | null {
  const detail = getSubscriberDetail(authKeyId);
  if (!detail) {
    return null;
  }

  return renderLayout({
    title: "Auth Key",
    activePath: "/auth-keys",
    subtitle: "Grouped subscription history and creator relationships for one derived auth key.",
    content: [
      renderSummaryCards([
        renderMetricCard({ label: "Subscriptions", value: asMetric(detail.subscriber.subscriptionCount), hint: `${detail.subscriber.activeSubscriptionCount} active` }),
        renderMetricCard({ label: "Creators", value: asMetric(detail.subscriber.creatorCount), hint: `${detail.subscriber.planCount} plans joined` }),
        renderMetricCard({ label: "Total spent", value: fmt.formatUsdcAtomic(detail.subscriber.totalSpent), hint: "Across all subscriptions" }),
        renderMetricCard({ label: "Last charge", value: fmt.formatDateTime(detail.subscriber.lastChargedAt), hint: fmt.formatRelativeTime(detail.subscriber.lastChargedAt) }),
      ]),
      renderSection(
        "Auth Key Record",
        renderInfoGrid([
          { label: "Auth key ID", value: detail.subscriber.authKeyId, mono: true },
          { label: "Auth public key", value: fmt.maskValue(detail.subscriber.authPublicKey, { start: 16, end: 12 }) },
          { label: "First seen", value: fmt.formatDateTime(detail.subscriber.createdAt) },
          { label: "Last charged", value: fmt.formatDateTime(detail.subscriber.lastChargedAt) },
        ]),
      ),
      renderSection(
        "Related Creators",
        renderSubtleList(detail.creators.map((creator) => renderPillLink(`/creators/${creator.id}`, creator.name))),
      ),
      renderSection(
        "Subscriptions",
        renderTable({
          columns: ["Subscription", "Plan / Creator", "Auth Key", "Status", "Spent", "Next charge"],
          rows: detail.subscriptions.map(subscriptionRow),
          emptyLabel: "No subscriptions linked to this auth key.",
        }),
      ),
      renderSection(
        "Charges",
        renderTable({
          columns: ["Charge", "Status", "Amount / Subscription", "Plan / Creator", "Created"],
          rows: detail.charges.map(chargeRow),
          emptyLabel: "No charges yet for this auth key.",
        }),
      ),
    ].join(""),
  });
}

function subscriptionsPage(params: {
  creatorId?: string;
  planId?: string;
  authKeyId?: string;
  status: SubscriptionStatusFilter;
}): string {
  const subscriptions = listSubscriptions({
    creatorId: params.creatorId,
    planId: params.planId,
    authKeyId: params.authKeyId,
    status: params.status,
  });

  const filters = `<form method="get" class="grid gap-4 rounded-[1.5rem] border border-white/60 bg-white/80 p-4 shadow-glow md:grid-cols-2 xl:grid-cols-5">
    ${textInput("creatorId", params.creatorId, "Creator ID")}
    ${textInput("planId", params.planId, "Plan ID")}
    ${textInput("authKeyId", params.authKeyId, "Auth Key ID")}
    ${selectInput("status", "Status", statusOptions(SUBSCRIPTION_STATUSES, params.status))}
    <div class="flex items-end gap-2">
      <button class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white">Apply filters</button>
      <a href="/subscriptions" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">Reset</a>
    </div>
  </form>`;

  return renderLayout({
    title: "Subscriptions",
    activePath: "/subscriptions",
    content: [
      renderSection("Filter", filters, {
        subtitle: "Narrow subscriptions by creator, plan, auth key, or lifecycle status.",
      }),
      renderSection(
        "Subscription Ledger",
        renderTable({
          columns: ["Subscription", "Plan / Creator", "Auth Key", "Status", "Spent", "Next charge"],
          rows: subscriptions.map(subscriptionRow),
          emptyLabel: "No subscriptions match these filters.",
        }),
      ),
    ].join(""),
  });
}

async function subscriptionDetailPage(subscriptionId: string): Promise<string | null> {
  const detail = getSubscriptionDetail(subscriptionId);
  if (!detail) {
    return null;
  }

  const live = await readLiveSubscriptionSnapshot({
    subscriptionId,
    accountKeysJson: detail.accountKeysEncrypted,
  });

  const liveBalances = live
    ? renderTable({
        columns: ["Token", "Amount"],
        rows: live.balances.map((balance) => [balance.token, fmt.formatUsdcAtomic(balance.amount)]),
        emptyLabel: "No private balances were returned by Unlink.",
      })
    : renderEmpty("Live Unlink data is unavailable right now.");

  const liveTransactions = live
    ? renderTable({
        columns: ["Transaction", "Type / Status", "Token / Amount", "Created"],
        rows: live.transactions.map((transaction) => [
          `<div class="font-mono text-[13px] break-all">${transaction.id}</div>${renderLiveTransactionDetails(transaction.rawJson)}`,
          `${transaction.type ?? "-"}<div class="mt-1">${transaction.status ? renderStatusBadge(transaction.status) : "-"}</div>`,
          `${transaction.token ?? "-"}<div class="mt-1 text-xs text-slate-500">${transaction.amount ? fmt.formatUsdcAtomic(transaction.amount) : "-"}</div>`,
          `${fmt.formatDateTime(transaction.createdAt)}<div class="mt-1 text-xs text-slate-500">${fmt.formatRelativeTime(transaction.createdAt)}</div>`,
        ]),
        emptyLabel: "No recent Unlink transactions were returned.",
      })
    : renderEmpty("Live Unlink transactions are unavailable right now.");

  return renderLayout({
    title: "Subscription Detail",
    activePath: "/subscriptions",
    subtitle: "Database state enriched with live Unlink reads for this dedicated subscription account.",
    content: [
      renderSummaryCards([
        renderMetricCard({ label: "Status", value: detail.subscription.status, hint: fmt.formatNextChargeLabel({ status: detail.subscription.status, nextChargeAt: detail.subscription.nextChargeAt }) }),
        renderMetricCard({ label: "Plan amount", value: fmt.formatUsdcAtomic(detail.subscription.amount), hint: `Every ${detail.subscription.intervalSeconds}s` }),
        renderMetricCard({ label: "Total spent", value: fmt.formatUsdcAtomic(detail.subscription.totalSpent), hint: `${detail.subscription.chargeCount} recorded charges` }),
        renderMetricCard({ label: "Live USDC balance", value: live ? fmt.formatUsdcAtomic(live.usdcBalance) : "Unavailable", hint: "Current private balance from Unlink" }),
      ]),
      renderSection(
        "Subscription Record",
        renderInfoGrid([
          { label: "Subscription ID", value: detail.subscription.id, mono: true },
          { label: "Creator", value: `${detail.creator.name} (${detail.creator.id})` },
          { label: "Plan", value: `${detail.plan.name} (${detail.plan.id})` },
          { label: "Auth key ID", value: detail.subscription.authKeyId, mono: true },
          { label: "Auth public key", value: fmt.maskValue(detail.subscription.authPublicKey, { start: 16, end: 12 }) },
          { label: "Dedicated Unlink address", value: detail.subscription.unlinkAddress, mono: true },
          { label: "Account keys JSON", value: detail.subscription.accountKeysMasked },
          { label: "Created", value: fmt.formatDateTime(detail.subscription.createdAt) },
          { label: "Last charged", value: fmt.formatDateTime(detail.subscription.lastChargedAt) },
          { label: "Next charge", value: `${fmt.formatDateTime(detail.subscription.nextChargeAt)} (${fmt.formatNextChargeLabel({ status: detail.subscription.status, nextChargeAt: detail.subscription.nextChargeAt })})` },
          { label: "Consecutive failures", value: String(detail.subscription.consecutiveFailures) },
          { label: "Cancelled at", value: fmt.formatDateTime(detail.subscription.cancelledAt) },
        ]),
        {
          actions: [
            renderPillLink(`/creators/${detail.creator.id}`, "Open creator"),
            renderPillLink(`/plans/${detail.plan.id}`, "Open plan"),
            renderPillLink(authKeyHref(detail.subscriber.authKeyId), "Open auth key"),
          ].join(""),
        },
      ),
      renderSection("Charge History", renderTable({
        columns: ["Charge", "Status", "Amount / Subscription", "Plan / Creator", "Created"],
        rows: detail.charges.map(chargeRow),
        emptyLabel: "No charges recorded for this subscription yet.",
      })),
      renderSection("Live Unlink Balances", liveBalances, {
        subtitle: "Fetched live from Unlink using the stored dedicated account keys.",
      }),
      renderSection("Live Unlink Transactions", liveTransactions),
    ].join(""),
  });
}

function chargesPage(params: {
  creatorId?: string;
  subscriptionId?: string;
  status: ChargeStatusFilter;
}): string {
  const charges = listCharges({
    creatorId: params.creatorId,
    subscriptionId: params.subscriptionId,
    status: params.status,
  });

  const filters = `<form method="get" class="grid gap-4 rounded-[1.5rem] border border-white/60 bg-white/80 p-4 shadow-glow md:grid-cols-2 xl:grid-cols-4">
    ${textInput("creatorId", params.creatorId, "Creator ID")}
    ${textInput("subscriptionId", params.subscriptionId, "Subscription ID")}
    ${selectInput("status", "Status", statusOptions(CHARGE_STATUSES, params.status))}
    <div class="flex items-end gap-2">
      <button class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white">Apply filters</button>
      <a href="/charges" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">Reset</a>
    </div>
  </form>`;

  return renderLayout({
    title: "Charges",
    activePath: "/charges",
    content: [
      renderSection("Filter", filters, {
        subtitle: "Inspect the charge ledger by creator, subscription, or status.",
      }),
      renderSection(
        "Charge Ledger",
        renderTable({
          columns: ["Charge", "Status", "Amount / Subscription", "Plan / Creator", "Created"],
          rows: charges.map(chargeRow),
          emptyLabel: "No charges match these filters.",
        }),
      ),
    ].join(""),
  });
}

function chargeDetailPage(chargeId: string): string | null {
  const detail = getChargeDetail(chargeId);
  if (!detail) {
    return null;
  }

  return renderLayout({
    title: "Charge Detail",
    activePath: "/charges",
    subtitle: "Single charge record with all upstream relations.",
    content: [
      renderSummaryCards([
        renderMetricCard({ label: "Status", value: detail.charge.status, hint: detail.charge.unlinkTxId ?? "No Unlink tx id" }),
        renderMetricCard({ label: "Amount", value: fmt.formatUsdcAtomic(detail.charge.amount), hint: `Subscription ${detail.subscription.id}` }),
        renderMetricCard({ label: "Created", value: fmt.formatDateTime(detail.charge.createdAt), hint: fmt.formatRelativeTime(detail.charge.createdAt) }),
        renderMetricCard({ label: "Completed", value: fmt.formatDateTime(detail.charge.completedAt), hint: detail.charge.errorMessageMasked ?? "No public error message" }),
      ]),
      renderSection(
        "Charge Record",
        renderInfoGrid([
          { label: "Charge ID", value: detail.charge.id, mono: true },
          { label: "Subscription ID", value: detail.subscription.id, mono: true },
          { label: "Plan", value: `${detail.plan.name} (${detail.plan.id})` },
          { label: "Creator", value: `${detail.creator.name} (${detail.creator.id})` },
          { label: "Auth key", value: detail.subscriber.authKeyId, mono: true },
          { label: "Unlink tx ID", value: detail.charge.unlinkTxId ?? "-", mono: true },
        ]),
        {
          actions: [
            renderPillLink(`/subscriptions/${detail.subscription.id}`, "Open subscription"),
            renderPillLink(`/plans/${detail.plan.id}`, "Open plan"),
            renderPillLink(`/creators/${detail.creator.id}`, "Open creator"),
            renderPillLink(authKeyHref(detail.subscriber.authKeyId), "Open auth key"),
          ].join(""),
        },
      ),
    ].join(""),
  });
}

export const explorerApp = new Hono();

explorerApp.use("*", async (c, next) => {
  const startedAt = Date.now();
  await next();
  c.res = await logRejectedHttpResponse({
    scope: "explorer",
    method: c.req.method.toUpperCase(),
    pathname: c.req.path,
    startedAt,
    response: c.res,
  });
});

explorerApp.get("/", (c) => c.html(dashboardPage()));
explorerApp.get("/creators", (c) => c.html(creatorsPage()));
explorerApp.get("/creators/:creatorId", (c) => {
  const page = creatorDetailPage(c.req.param("creatorId"));
  return page
    ? c.html(page)
    : renderNotFoundPage("Creator not found", "No creator matched this id.", "/creators");
});
explorerApp.get("/plans", (c) => c.html(plansPage()));
explorerApp.get("/plans/:planId", (c) => {
  const page = planDetailPage(c.req.param("planId"));
  return page
    ? c.html(page)
    : renderNotFoundPage("Plan not found", "No plan matched this id.", "/plans");
});
explorerApp.get("/auth-keys", (c) => c.html(subscribersPage()));
explorerApp.get("/auth-keys/:authKeyId", (c) => {
  const page = subscriberDetailPage(c.req.param("authKeyId"));
  return page
    ? c.html(page)
    : renderNotFoundPage("Auth key not found", "No grouped auth key matched this identifier.", "/auth-keys");
});
explorerApp.get("/subscribers", (c) => c.redirect("/auth-keys", 301));
explorerApp.get("/subscribers/:authKeyId", (c) =>
  c.redirect(authKeyHref(c.req.param("authKeyId")), 301),
);
explorerApp.get("/subscriptions", (c) => {
  const rawStatus = c.req.query("status") ?? "all";
  const status = SUBSCRIPTION_STATUSES.includes(rawStatus as SubscriptionStatusFilter)
    ? (rawStatus as SubscriptionStatusFilter)
    : "all";
  return c.html(
    subscriptionsPage({
      creatorId: c.req.query("creatorId")?.trim() || undefined,
      planId: c.req.query("planId")?.trim() || undefined,
      authKeyId: c.req.query("authKeyId")?.trim() || undefined,
      status,
    }),
  );
});
explorerApp.get("/subscriptions/:subscriptionId", async (c) => {
  const page = await subscriptionDetailPage(c.req.param("subscriptionId"));
  return page
    ? c.html(page)
    : renderNotFoundPage("Subscription not found", "No subscription matched this id.", "/subscriptions");
});
explorerApp.get("/charges", (c) => {
  const rawStatus = c.req.query("status") ?? "all";
  const status = CHARGE_STATUSES.includes(rawStatus as ChargeStatusFilter)
    ? (rawStatus as ChargeStatusFilter)
    : "all";
  return c.html(
    chargesPage({
      creatorId: c.req.query("creatorId")?.trim() || undefined,
      subscriptionId: c.req.query("subscriptionId")?.trim() || undefined,
      status,
    }),
  );
});
explorerApp.get("/charges/:chargeId", (c) => {
  const page = chargeDetailPage(c.req.param("chargeId"));
  return page
    ? c.html(page)
    : renderNotFoundPage("Charge not found", "No charge matched this id.", "/charges");
});

explorerApp.notFound((c) =>
  c.html(
    renderLayout({
      title: "Route not found",
      activePath: "/",
      content: renderEmpty("This explorer page does not exist."),
    }),
    404,
  ),
);
