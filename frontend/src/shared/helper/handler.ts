import type { TAxiosApiError } from "@shared/api";
import { normalizeError } from "./normalizeError";
import { message } from "antd";

export const makeRequest = async <T = any>(
  cb: (() => Promise<T>) | Promise<T>
) => {
  try {
    if (typeof cb === "function") {
      return await cb();
    } else {
      return await cb;
    }
  } catch (e) {
    const error = e as TAxiosApiError;
    const errorMessage = normalizeError(error);
    message.error(errorMessage);
    throw e;
  }
};
