import { queryOptions, type UseQueryOptions } from "@tanstack/react-query";
import { queuesApi } from ".";
import type { QueueSnapshotResponse } from "../types";

export const queueQueryKeys = {
    getQueue: ["queue"]
}

export const queueQueryOptions = {
    getQueue: (queryId: number | string, options?: Partial<UseQueryOptions<QueueSnapshotResponse>>) => queryOptions({
        queryKey: queueQueryKeys.getQueue,
        queryFn: async () => await queuesApi.getQueueSnapshot(queryId),
        ...options
    }),

    // getTicket: (options?: Partial<UseQueryOptions<QueueSnapshotResponse>>) => queryOptions({
    //     queryKey: ["ticket"],
    //     queryFn: async () => await queuesApi.getTicket(),
    //     ...options
    // }),
}