import { Hono } from "hono";

import { HttpError, errorResponse } from "./http";
import { logRejectedHttpResponse } from "./log";
import { handleRunCron } from "./routes/admin";
import { handleGetCharges } from "./routes/charges";
import {
  handleCreateCreator,
  handleGetCreator,
  handleGetCreatorByEvmAddress,
  handleRevealCreator,
} from "./routes/creators";
import { handleHealth } from "./routes/health";
import { handleCreatePlan, handleGetPlan, handleListPlans } from "./routes/plans";
import {
  handleCancelSubscription,
  handleListCreatorSubscriptions,
  handleListSubscriptions,
  handleSubscribe,
} from "./routes/subscriptions";
import { handleVerify } from "./routes/verify";

export const apiApp = new Hono();

apiApp.use("*", async (c, next) => {
  const startedAt = Date.now();
  await next();
  c.res = await logRejectedHttpResponse({
    scope: "api",
    method: c.req.method.toUpperCase(),
    pathname: c.req.path,
    startedAt,
    response: c.res,
  });
});

apiApp.get("/health", () => handleHealth());

apiApp.post("/creators", (c) => handleCreateCreator(c.req.raw));
apiApp.post("/creators/reveal", (c) => handleRevealCreator(c.req.raw));
apiApp.get("/creators/by-evm/:evmAddress", (c) => handleGetCreatorByEvmAddress(c.req.param("evmAddress")));
apiApp.get("/creators/:creatorId", (c) => handleGetCreator(c.req.param("creatorId")));

apiApp.post("/plans", (c) => handleCreatePlan(c.req.raw));
apiApp.get("/plans", (c) => handleListPlans(c.req.raw));
apiApp.get("/plans/:planId", (c) => handleGetPlan(c.req.param("planId")));

apiApp.post("/subscribe", (c) => handleSubscribe(c.req.raw));
apiApp.get("/creators/subscriptions", (c) =>
  handleListCreatorSubscriptions(c.req.raw),
);
apiApp.get("/subscriptions", (c) => handleListSubscriptions(c.req.raw));
apiApp.delete("/subscriptions/:subscriptionId", (c) =>
  handleCancelSubscription(c.req.param("subscriptionId"), c.req.raw),
);

apiApp.get("/charges/:subscriptionId", (c) =>
  handleGetCharges(c.req.param("subscriptionId"), c.req.raw),
);

apiApp.post("/admin/run-cron", (c) => handleRunCron(c.req.raw));

apiApp.get("/verify/:planId", (c) => handleVerify(c.req.param("planId"), c.req.raw));

apiApp.notFound(() => errorResponse(404, "Route not found."));

apiApp.onError((error) => {
  if (error instanceof HttpError) {
    return errorResponse(error.status, error.message, error.details);
  }

  return errorResponse(
    500,
    error instanceof Error ? error.message : "Unexpected server error.",
  );
});

export function handleRequest(request: Request): Promise<Response> {
  return Promise.resolve(apiApp.fetch(request));
}
