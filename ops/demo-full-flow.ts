import { createBearerToken } from "./create-bearer-token";
import { getSublinkApiUrl } from "./lib/backend-api";
import {
  childLogger,
  createConsoleLogger,
  getErrorMessage,
} from "./lib/progress";
import { runCron } from "./run-cron";
import { setupCreator } from "./setup-creator";
import { subscribeToPlan } from "./subscribe";
import { verifyAccess } from "./verify-access";

type StageTiming = {
  durationMs: number;
  status: "completed" | "failed";
};

export async function demoFullFlow() {
  const log = createConsoleLogger("demo-full-flow");
  const startedAt = Date.now();
  const stageTimings: Record<string, StageTiming> = {};

  async function runStage<T>(stageName: string, task: () => Promise<T>): Promise<T> {
    log("Stage started", {
      stage: stageName,
    });
    const stageStartedAt = Date.now();
    try {
      const result = await task();
      stageTimings[stageName] = {
        durationMs: Date.now() - stageStartedAt,
        status: "completed",
      };
      log("Stage completed", {
        stage: stageName,
        durationMs: stageTimings[stageName].durationMs,
      });
      return result;
    } catch (error) {
      stageTimings[stageName] = {
        durationMs: Date.now() - stageStartedAt,
        status: "failed",
      };
      log("Stage failed", {
        stage: stageName,
        durationMs: stageTimings[stageName].durationMs,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  log("Starting demo flow", {
    sublinkApiUrl: getSublinkApiUrl(),
  });
  try {
    const creatorSetup = await runStage("setupCreator", () =>
      setupCreator({
        log: childLogger(log, "setup-creator"),
      }),
    );
    log("Creator setup complete", {
      creatorId: creatorSetup.creator.id,
      planId: creatorSetup.plan.id,
    });
    const subscribeResult = await runStage("subscribeToPlan", () =>
      subscribeToPlan(creatorSetup.plan.id, {
        log: childLogger(log, "subscribe"),
      }),
    );
    log("Subscription flow complete", {
      subscriptionId: subscribeResult.subscription.subscriptionId,
      firstChargeStatus: subscribeResult.subscription.firstCharge.status,
    });

    const tokenResult = await runStage("createBearerToken", () =>
      createBearerToken(subscribeResult.subscription.subscriptionId, {
        log: childLogger(log, "create-bearer-token"),
      }),
    );
    log("Bearer token ready", {
      subscriptionId: tokenResult.subscriptionId,
      expiry: tokenResult.expiry,
    });

    const verifyResult = await runStage("verifyAccess", () =>
      verifyAccess({
        planId: creatorSetup.plan.id,
        bearerToken: tokenResult.token,
        apiKey: creatorSetup.creator.apiKey,
        log: childLogger(log, "verify-access"),
      }),
    );
    log("Access verification complete", {
      status: verifyResult.status,
    });

    const cronResult = await runStage("runCron", () =>
      runCron({
        log: childLogger(log, "run-cron"),
      }),
    );
    log("Cron run complete", {
      status: cronResult.status,
      durationMs: Date.now() - startedAt,
      stageTimings,
    });

    return {
      creatorSetup,
      subscribeResult,
      tokenResult,
      verifyResult,
      cronResult,
      stageTimings,
    };
  } catch (error) {
    log("Demo flow failed", {
      durationMs: Date.now() - startedAt,
      error: getErrorMessage(error),
      stageTimings,
    });
    throw error;
  }
}

if (import.meta.main) {
  try {
    const result = await demoFullFlow();
    console.log(JSON.stringify(result, null, 2));
  } catch {
    process.exitCode = 1;
  }
}
