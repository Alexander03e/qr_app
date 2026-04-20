import { mutationOptions } from "@tanstack/react-query";
import { queryClient, type MutationOptionsType } from "@shared/api";
import type {
  AdminCompany,
  AdminCreateFeedbackPayload,
  AdminCreateOperatorPayload,
  AdminCreateQueuePayload,
  AdminFeedbackItem,
  AdminOperator,
  AdminQueue,
  AdminUpdateCompanyPayload,
  AdminUpdateFeedbackPayload,
  AdminUpdateOperatorPayload,
  AdminUpdateQueuePayload,
  AdminUpdateSettingsPayload,
  AdminUpdateSettingsResponse,
} from "@shared/entities/admin/types";

import { adminApi } from ".";
import { adminQueryKeys } from "./queries";

export const adminMutationKeys = {
  createOperator: ["admin", "operator", "create"] as const,
  updateOperator: ["admin", "operator", "update"] as const,
  deleteOperator: ["admin", "operator", "delete"] as const,
  createQueue: ["admin", "queue", "create"] as const,
  updateQueue: ["admin", "queue", "update"] as const,
  deleteQueue: ["admin", "queue", "delete"] as const,
  createFeedback: ["admin", "feedback", "create"] as const,
  updateFeedback: ["admin", "feedback", "update"] as const,
  deleteFeedback: ["admin", "feedback", "delete"] as const,
  updateCompany: ["admin", "company", "update"] as const,
  updateAdminSettings: ["admin", "settings", "update"] as const,
};

interface UpdateOperatorVariables {
  id: number;
  payload: AdminUpdateOperatorPayload;
}

interface UpdateQueueVariables {
  id: number;
  payload: AdminUpdateQueuePayload;
}

interface UpdateFeedbackVariables {
  id: number;
  payload: AdminUpdateFeedbackPayload;
}

interface UpdateCompanyVariables {
  id: number;
  payload: AdminUpdateCompanyPayload;
}

export const adminMutationOptions = {
  createOperator: (
    options?: MutationOptionsType<AdminOperator, AdminCreateOperatorPayload>,
  ) =>
    mutationOptions({
      mutationKey: adminMutationKeys.createOperator,
      mutationFn: (payload: AdminCreateOperatorPayload) =>
        adminApi.createOperator(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  updateOperator: (
    options?: MutationOptionsType<AdminOperator, UpdateOperatorVariables>,
  ) =>
    mutationOptions({
      mutationKey: adminMutationKeys.updateOperator,
      mutationFn: ({ id, payload }: UpdateOperatorVariables) =>
        adminApi.updateOperator(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  deleteOperator: (options?: MutationOptionsType<void, number>) =>
    mutationOptions({
      mutationKey: adminMutationKeys.deleteOperator,
      mutationFn: (id: number) => adminApi.deleteOperator(id),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  createQueue: (
    options?: MutationOptionsType<AdminQueue, AdminCreateQueuePayload>,
  ) =>
    mutationOptions({
      mutationKey: adminMutationKeys.createQueue,
      mutationFn: (payload: AdminCreateQueuePayload) => adminApi.createQueue(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  updateQueue: (options?: MutationOptionsType<AdminQueue, UpdateQueueVariables>) =>
    mutationOptions({
      mutationKey: adminMutationKeys.updateQueue,
      mutationFn: ({ id, payload }: UpdateQueueVariables) =>
        adminApi.updateQueue(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  deleteQueue: (options?: MutationOptionsType<void, number>) =>
    mutationOptions({
      mutationKey: adminMutationKeys.deleteQueue,
      mutationFn: (id: number) => adminApi.deleteQueue(id),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  createFeedback: (
    options?: MutationOptionsType<AdminFeedbackItem, AdminCreateFeedbackPayload>,
  ) =>
    mutationOptions({
      mutationKey: adminMutationKeys.createFeedback,
      mutationFn: (payload: AdminCreateFeedbackPayload) =>
        adminApi.createFeedback(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  updateFeedback: (
    options?: MutationOptionsType<AdminFeedbackItem, UpdateFeedbackVariables>,
  ) =>
    mutationOptions({
      mutationKey: adminMutationKeys.updateFeedback,
      mutationFn: ({ id, payload }: UpdateFeedbackVariables) =>
        adminApi.updateFeedback(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  deleteFeedback: (options?: MutationOptionsType<void, number>) =>
    mutationOptions({
      mutationKey: adminMutationKeys.deleteFeedback,
      mutationFn: (id: number) => adminApi.deleteFeedback(id),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  updateCompany: (
    options?: MutationOptionsType<AdminCompany, UpdateCompanyVariables>,
  ) =>
    mutationOptions({
      mutationKey: adminMutationKeys.updateCompany,
      mutationFn: ({ id, payload }: UpdateCompanyVariables) =>
        adminApi.updateCompany(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.companies });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),

  updateAdminSettings: (
    options?: MutationOptionsType<AdminUpdateSettingsResponse, AdminUpdateSettingsPayload>,
  ) =>
    mutationOptions({
      mutationKey: adminMutationKeys.updateAdminSettings,
      mutationFn: (payload: AdminUpdateSettingsPayload) =>
        adminApi.updateAdminSettings(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.session });
        await options?.onSuccess?.(...args);
      },
      ...options,
    }),
};
