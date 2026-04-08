import type { TApiError } from "@shared/api/types";
import { AxiosError } from "axios";

type TOptions = {
    defaultMessage?: string
}

export const normalizeError = (error: AxiosError | unknown, options?: TOptions): string => {
    const defaultMessage = options?.defaultMessage || "Error"

    if (error instanceof AxiosError) {
        const data = (error.response?.data) as TApiError;
        if (!data.message) {
            return defaultMessage;
        }
        return Array.isArray(data.message) ? data.message[0] : data.message
    }

    return defaultMessage
}