import { mutationOptions } from "@tanstack/react-query";
import type { MutationOptionsType } from "@shared/api";
import { feedbackApi } from ".";
import type {
  ClientFeedbackCreateRequest,
  ClientFeedbackItemResponse,
} from "../types";

export const feedbackMutationKeys = {
  createClientFeedback: ["feedback", "client", "create"] as const,
};

export const feedbackMutationOptions = {
  createClientFeedback: (
    options?: MutationOptionsType<
      ClientFeedbackItemResponse,
      ClientFeedbackCreateRequest
    >,
  ) =>
    mutationOptions({
      mutationKey: feedbackMutationKeys.createClientFeedback,
      mutationFn: (payload: ClientFeedbackCreateRequest) =>
        feedbackApi.createClientFeedback(payload),
      ...options,
    }),
};
