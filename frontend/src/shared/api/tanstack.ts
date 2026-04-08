import { QueryClient, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import type { TAxiosApiError } from "./types";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 0,
        },
    },
});

export type QueryOptionsType<Response, Error = TAxiosApiError> = Partial<UseQueryOptions<Response, Error, Response, readonly unknown[]>>
export type MutationOptionsType<Response, Request = unknown, Error = TAxiosApiError,> = Partial<UseMutationOptions<Response, Error, Request>>