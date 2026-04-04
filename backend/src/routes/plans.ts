import { getCreatorById } from "../db/creators";
import {
  createPlan,
  getPlanWithCreatorById,
  listActivePlans,
} from "../db/plans";
import {
  HttpError,
  errorResponse,
  jsonResponse,
  nowIso,
  readJsonBody,
  requireInteger,
  requireString,
} from "../http";

interface CreatePlanBody {
  creatorId?: unknown;
  name?: unknown;
  amount?: unknown;
  intervalSeconds?: unknown;
  description?: unknown;
  spendingCap?: unknown;
}

function isAtomicAmount(value: string): boolean {
  return /^[0-9]+$/.test(value) && BigInt(value) > 0n;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unique constraint failed")
  );
}

export async function handleCreatePlan(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<CreatePlanBody>(request);

    const creatorId = requireString(body.creatorId, "creatorId");
    const name = requireString(body.name, "name");
    const amount = requireString(body.amount, "amount");
    const intervalSeconds = requireInteger(body.intervalSeconds, "intervalSeconds", {
      min: 1,
    });

    const description =
      body.description === undefined || body.description === null
        ? ""
        : requireString(body.description, "description", { allowEmpty: true });

    const spendingCap =
      body.spendingCap === undefined || body.spendingCap === null
        ? "0"
        : requireString(body.spendingCap, "spendingCap");

    if (!isAtomicAmount(amount)) {
      throw new HttpError(400, "amount must be a positive integer string.");
    }

    if (!/^[0-9]+$/.test(spendingCap)) {
      throw new HttpError(
        400,
        "spendingCap must be an integer string (or '0' for unlimited).",
      );
    }

    const creator = getCreatorById(creatorId);
    if (!creator) {
      return errorResponse(404, "Creator not found.");
    }

    const plan = createPlan({
      id: crypto.randomUUID(),
      creatorId,
      name,
      description,
      amount,
      intervalSeconds,
      spendingCap,
      active: true,
      createdAt: nowIso(),
    });

    return jsonResponse(plan, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message, error.details);
    }

    if (isUniqueConstraintError(error)) {
      return errorResponse(409, "Plan already exists.");
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Failed to create plan.",
    );
  }
}

export function handleListPlans(request: Request): Response {
  const url = new URL(request.url);
  const creatorId = url.searchParams.get("creatorId")?.trim() || undefined;

  const plans = listActivePlans(creatorId);
  return jsonResponse({ plans });
}

export function handleGetPlan(planId: string): Response {
  const plan = getPlanWithCreatorById(planId);
  if (!plan) {
    return errorResponse(404, "Plan not found.");
  }

  return jsonResponse(plan);
}
