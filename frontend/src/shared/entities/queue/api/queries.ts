import { queryOptions } from "@tanstack/react-query";
import type { Query as TanQuery } from '@tanstack/query-core';
import { queuesApi } from ".";
import type { QueueSnapshotResponse } from "../types";
import { POLLING_INTERVAL_MS } from "@shared/consts";
import type { TAxiosApiError } from "@shared/api/types";
import type { QueryOptionsType } from "@shared/api";

export const queueQueryKeys = {
    getQueue: (queueId: string | number, clientId?: string | null) => ["queue", queueId, clientId ?? "anonymous"]
}


export const queueQueryOptions = {
    getQueue: (
        queryId: number | string,
        clientId?: string | null,
        options?: QueryOptionsType<QueueSnapshotResponse>,
    ) => queryOptions({
        queryKey: queueQueryKeys.getQueue(queryId, clientId),
        queryFn: async () => await queuesApi.getQueueSnapshot(queryId, clientId ?? undefined),
        refetchInterval: (query: TanQuery<QueueSnapshotResponse, TAxiosApiError, QueueSnapshotResponse, readonly unknown[]>) =>
            query.state.status === 'error' ? false : POLLING_INTERVAL_MS,
        ...options
    }),
}