import type { AxiosError } from "axios"

export type TApiError = {
    message: string | string[]
    timestamp: string
}

export type TAxiosApiError = AxiosError<TApiError>
