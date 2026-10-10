import type { Env } from "./types";
import { refreshExchangeRate } from "./exchangeRate";
import { runBillingReconciliation } from "./billing";
import { runOperationJobs } from "./operationJobs";
import { runSocialStudioScheduler } from "./socialStudioScheduler";
import { cleanupSurveys, processSurveyAiJobs, processSurveyEvents } from "./surveys/tasks";

export type AsyncJob = {
  id: string;
  kind: "operation_drain" | "social_drain" | "billing_reconcile" | "exchange_rate_refresh" | "survey_delivery" | "survey_ai" | "survey_cleanup";
  requestedAt: number;
};

const validJob = (value: unknown): value is AsyncJob => {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<AsyncJob>;
  return typeof job.id === "string" && job.id.length >= 12 && typeof job.requestedAt === "number"
    && ["operation_drain", "social_drain", "billing_reconcile", "exchange_rate_refresh", "survey_delivery", "survey_ai", "survey_cleanup"].includes(String(job.kind));
};

async function execute(job: AsyncJob, env: Env) {
  if (job.kind === "operation_drain") return runOperationJobs(env);
  if (job.kind === "social_drain") return runSocialStudioScheduler(env);
  if (job.kind === "billing_reconcile") return runBillingReconciliation(env);
  if (job.kind === "survey_delivery") return processSurveyEvents(env);
  if (job.kind === "survey_ai") return processSurveyAiJobs(env);
  if (job.kind === "survey_cleanup") return cleanupSurveys(env);
  return refreshExchangeRate(env);
}

export async function consumeAsyncJobs(batch: MessageBatch<unknown>, env: Env) {
  for (const message of batch.messages) {
    if (!validJob(message.body)) {
      console.error(JSON.stringify({ event: "async_job_invalid", messageId: message.id }));
      message.ack();
      continue;
    }
    try {
      await execute(message.body, env);
      message.ack();
    } catch (error) {
      console.error(JSON.stringify({ event: "async_job_failed", jobId: message.body.id, kind: message.body.kind, error: String(error) }));
      message.retry();
    }
  }
}

export async function enqueueAsyncJobs(env: Env, kinds: AsyncJob["kind"][]) {
  const requestedAt = Date.now();
  await env.ASYNC_JOBS.sendBatch(kinds.map((kind) => ({
    body: { id: `job_${crypto.randomUUID().replace(/-/g, "")}`, kind, requestedAt } satisfies AsyncJob,
    contentType: "json" as const,
  })));
}
