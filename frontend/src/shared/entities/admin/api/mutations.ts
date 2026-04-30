import { mutationOptions } from "@tanstack/react-query";
import { queryClient, type MutationOptionsType } from "@shared/api";
import type {
  AdminBranch,
  AdminCompany,
  AdminCreateBranchPayload,
  AdminCreateFeedbackPayload,
  AdminCreateOperatorPayload,
  AdminCreateQueuePayload,
  AdminFeedbackItem,
  AdminOperator,
  AdminQueue,
  AdminUpdateBranchPayload,
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
  createBranch: ["admin", "branch", "create"] as const,
  updateBranch: ["admin", "branch", "update"] as const,
  deleteBranch: ["admin", "branch", "delete"] as const,
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

interface UpdateBranchVariables {
  id: number;
  payload: AdminUpdateBranchPayload;
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
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.createOperator,
      mutationFn: (payload: AdminCreateOperatorPayload) =>
        adminApi.createOperator(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  updateOperator: (
    options?: MutationOptionsType<AdminOperator, UpdateOperatorVariables>,
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.updateOperator,
      mutationFn: ({ id, payload }: UpdateOperatorVariables) =>
        adminApi.updateOperator(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  deleteOperator: (options?: MutationOptionsType<void, number>) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.deleteOperator,
      mutationFn: (id: number) => adminApi.deleteOperator(id),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  createBranch: (
    options?: MutationOptionsType<AdminBranch, AdminCreateBranchPayload>,
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.createBranch,
      mutationFn: (payload: AdminCreateBranchPayload) =>
        adminApi.createBranch(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.branches });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  updateBranch: (options?: MutationOptionsType<AdminBranch, UpdateBranchVariables>) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.updateBranch,
      mutationFn: ({ id, payload }: UpdateBranchVariables) =>
        adminApi.updateBranch(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.branches });
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  deleteBranch: (options?: MutationOptionsType<void, number>) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.deleteBranch,
      mutationFn: (id: number) => adminApi.deleteBranch(id),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.branches });
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  createQueue: (
    options?: MutationOptionsType<AdminQueue, AdminCreateQueuePayload>,
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.createQueue,
      mutationFn: (payload: AdminCreateQueuePayload) => adminApi.createQueue(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  updateQueue: (options?: MutationOptionsType<AdminQueue, UpdateQueueVariables>) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.updateQueue,
      mutationFn: ({ id, payload }: UpdateQueueVariables) =>
        adminApi.updateQueue(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  deleteQueue: (options?: MutationOptionsType<void, number>) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.deleteQueue,
      mutationFn: (id: number) => adminApi.deleteQueue(id),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  createFeedback: (
    options?: MutationOptionsType<AdminFeedbackItem, AdminCreateFeedbackPayload>,
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.createFeedback,
      mutationFn: (payload: AdminCreateFeedbackPayload) =>
        adminApi.createFeedback(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  updateFeedback: (
    options?: MutationOptionsType<AdminFeedbackItem, UpdateFeedbackVariables>,
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.updateFeedback,
      mutationFn: ({ id, payload }: UpdateFeedbackVariables) =>
        adminApi.updateFeedback(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  deleteFeedback: (options?: MutationOptionsType<void, number>) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.deleteFeedback,
      mutationFn: (id: number) => adminApi.deleteFeedback(id),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  updateCompany: (
    options?: MutationOptionsType<AdminCompany, UpdateCompanyVariables>,
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.updateCompany,
      mutationFn: ({ id, payload }: UpdateCompanyVariables) =>
        adminApi.updateCompany(id, payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.companies });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },

  updateAdminSettings: (
    options?: MutationOptionsType<AdminUpdateSettingsResponse, AdminUpdateSettingsPayload>,
  ) => {
    const { onSuccess, ...rest } = options ?? {};

    return mutationOptions({
      mutationKey: adminMutationKeys.updateAdminSettings,
      mutationFn: (payload: AdminUpdateSettingsPayload) =>
        adminApi.updateAdminSettings(payload),
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.session });
        await onSuccess?.(...args);
      },
      ...rest,
    });
  },
};
