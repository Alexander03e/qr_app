import { queryOptions } from "@tanstack/react-query";

import { adminApi } from ".";

export const adminQueryKeys = {
  companies: ["admin", "companies"] as const,
  branches: ["admin", "branches"] as const,
  queues: ["admin", "queues"] as const,
  queueById: (queueId: number) => ["admin", "queue", queueId] as const,
  operators: ["admin", "operators"] as const,
  feedback: ["admin", "feedback"] as const,
  metrics: ["admin", "metrics"] as const,
  queueSnapshot: (queueId: number) =>
    ["admin", "queue", queueId, "snapshot"] as const,
  session: ["admin", "me"] as const,
};

export const adminQueryOptions = {
  companies: () =>
    queryOptions({
      queryKey: adminQueryKeys.companies,
      queryFn: () => adminApi.getCompanies(),
    }),

  branches: () =>
    queryOptions({
      queryKey: adminQueryKeys.branches,
      queryFn: () => adminApi.getBranches(),
    }),

  queues: () =>
    queryOptions({
      queryKey: adminQueryKeys.queues,
      queryFn: () => adminApi.getQueues(),
    }),

  queueById: (queueId: number) =>
    queryOptions({
      queryKey: adminQueryKeys.queueById(queueId),
      queryFn: () => adminApi.getQueueById(queueId),
      enabled: Number.isFinite(queueId),
    }),

  operators: () =>
    queryOptions({
      queryKey: adminQueryKeys.operators,
      queryFn: () => adminApi.getOperators(),
    }),

  feedback: () =>
    queryOptions({
      queryKey: adminQueryKeys.feedback,
      queryFn: () => adminApi.getFeedback(),
    }),

  metrics: () =>
    queryOptions({
      queryKey: adminQueryKeys.metrics,
      queryFn: () => adminApi.getMetrics(),
      refetchInterval: 10000,
    }),

  queueSnapshot: (queueId: number) =>
    queryOptions({
      queryKey: adminQueryKeys.queueSnapshot(queueId),
      queryFn: () => adminApi.getQueueSnapshot(queueId),
      refetchInterval: 10000,
    }),
};
