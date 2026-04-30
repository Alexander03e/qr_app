import type {
  AdminBranch,
  AdminFeedbackItem,
  AdminOperator,
  AdminQueue,
} from "@shared/entities/admin/types";
import { adminAuth } from "@apps/admin/helpers/auth";
import { makeRequest } from "@shared/helper/handler";
import { useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";

import { useAdminDashboardController } from "./useAdminDashboardController";
import type {
  AdminSettingsFormValues,
  BranchFormValues,
  CompanyFormValues,
  FeedbackFormValues,
  OperatorFormValues,
  QueueFormValues,
} from "../types";

interface UseAdminDashboardActionsParams {
  dashboard: ReturnType<typeof useAdminDashboardController>;
  navigate: NavigateFunction;
}

export const useAdminDashboardActions = ({
  dashboard,
  navigate,
}: UseAdminDashboardActionsParams) => {
  const companyName =
    dashboard.companies[0]?.name ?? dashboard.t("admin.common.unknownCompany");

  const onLogout = useCallback(async () => {
    try {
      await makeRequest(adminAuth.logout());
    } finally {
      adminAuth.clearToken();
      navigate("/a/login", { replace: true });
    }
  }, [navigate]);

  const onPreferredLanguageChange = useCallback(
    (value: "ru" | "en") => {
      dashboard.i18n.changeLanguage(value);
      makeRequest(
        dashboard.updateAdminSettingsMutation.mutateAsync({
          preferred_language: value,
        }),
      );
    },
    [dashboard.i18n, dashboard.updateAdminSettingsMutation],
  );

  const openCreateOperator = useCallback(() => {
    dashboard.setEditingOperator(null);
    dashboard.operatorForm.resetFields();
    dashboard.operatorForm.setFieldValue("is_active", true);
    dashboard.operatorForm.setFieldValue("preferred_language", "ru");
    dashboard.operatorForm.setFieldValue("queue_ids", []);
    dashboard.setOperatorModalOpen(true);
  }, [dashboard]);

  const openCreateBranch = useCallback(() => {
    dashboard.setEditingBranch(null);
    dashboard.branchForm.resetFields();
    dashboard.branchForm.setFieldsValue({
      is_active: true,
      work_schedule_text: "{}",
    });
    dashboard.setBranchModalOpen(true);
  }, [dashboard]);

  const openEditBranch = useCallback(
    (branch: AdminBranch) => {
      dashboard.setEditingBranch(branch);
      dashboard.branchForm.setFieldsValue({
        name: branch.name,
        address: branch.address,
        is_active: branch.is_active,
        work_schedule_text: JSON.stringify(branch.work_schedule_json ?? {}, null, 2),
      });
      dashboard.setBranchModalOpen(true);
    },
    [dashboard],
  );

  const openEditOperator = useCallback(
    (operator: AdminOperator) => {
      dashboard.setEditingOperator(operator);
      dashboard.setOperatorModalOpen(true);
      dashboard.operatorForm.setFieldsValue({
        fullname: operator.fullname,
        email: operator.email,
        branch: operator.branch ?? undefined,
        preferred_language: operator.preferred_language,
        queue_ids: operator.queues.map((item) => item.id),
        is_active: operator.is_active,
      });
    },
    [dashboard],
  );

  const openCreateQueue = useCallback(() => {
    dashboard.setEditingQueue(null);
    dashboard.queueForm.resetFields();
    dashboard.setQueueModalOpen(true);
  }, [dashboard]);

  const openEditQueue = useCallback(
    (queue: AdminQueue) => {
      dashboard.setEditingQueue(queue);
      dashboard.setQueueModalOpen(true);
      dashboard.queueForm.setFieldsValue({
        branch: queue.branch ?? undefined,
        name: queue.name,
        language: queue.language,
        clients_limit: queue.clients_limit ?? undefined,
        called_ticket_timeout_seconds: queue.called_ticket_timeout_seconds ?? undefined,
        notification_options: {
          channels: Array.isArray(queue.notification_options?.channels)
            ? (queue.notification_options.channels as string[])
            : [],
        },
        poster_title: queue.poster_title ?? undefined,
        poster_subtitle: queue.poster_subtitle ?? undefined,
        queue_url: queue.queue_url ?? undefined,
      });
    },
    [dashboard],
  );

  const openCreateFeedback = useCallback(() => {
    dashboard.setEditingFeedback(null);
    dashboard.feedbackForm.resetFields();
    dashboard.feedbackForm.setFieldsValue({
      type: "FEEDBACK",
      status: "NEW",
    });
    dashboard.setFeedbackModalOpen(true);
  }, [dashboard]);

  const openEditFeedback = useCallback(
    (feedback: AdminFeedbackItem) => {
      dashboard.setEditingFeedback(feedback);
      dashboard.setFeedbackModalOpen(true);
      dashboard.feedbackForm.setFieldsValue({
        type: feedback.type,
        title: feedback.title,
        message: feedback.message,
        status: feedback.status,
        branch: feedback.branch ?? undefined,
        queue: feedback.queue ?? undefined,
      });
    },
    [dashboard],
  );

  const openQueueDetails = useCallback(
    (queue: AdminQueue) => {
      dashboard.setSelectedQueue(queue);
      dashboard.setQueueDetailsOpen(true);
    },
    [dashboard],
  );

  const closeQueueDetails = useCallback(() => {
    dashboard.setQueueDetailsOpen(false);
    dashboard.setSelectedQueue(null);
    dashboard.setSelectedOperatorForQueue(null);
  }, [dashboard]);

  const submitOperator = useCallback(
    async (values: OperatorFormValues) => {
      if (dashboard.editingOperator) {
        await makeRequest(
          dashboard.updateOperatorMutation.mutateAsync({
            id: dashboard.editingOperator.id,
            payload: {
              fullname: values.fullname,
              email: values.email,
              password: values.password || undefined,
              branch: values.branch ?? null,
              preferred_language: values.preferred_language,
              queue_ids: values.queue_ids ?? [],
              is_active: values.is_active,
            },
          }),
        );
        return;
      }

      await makeRequest(
        dashboard.createOperatorMutation.mutateAsync({
          fullname: values.fullname,
          email: values.email,
          password: values.password || "",
          branch: values.branch,
          preferred_language: values.preferred_language,
          queue_ids: values.queue_ids ?? [],
          is_active: values.is_active,
        }),
      );
    },
    [dashboard],
  );

  const submitBranch = useCallback(
    async (values: BranchFormValues) => {
      const company = dashboard.companies[0];
      if (!company) {
        return;
      }

      const workSchedule = values.work_schedule_text
        ? JSON.parse(values.work_schedule_text)
        : {};

      if (dashboard.editingBranch) {
        await makeRequest(
          dashboard.updateBranchMutation.mutateAsync({
            id: dashboard.editingBranch.id,
            payload: {
              company: company.id,
              name: values.name,
              address: values.address,
              is_active: values.is_active,
              work_schedule_json: workSchedule,
            },
          }),
        );
        return;
      }

      await makeRequest(
        dashboard.createBranchMutation.mutateAsync({
          company: company.id,
          name: values.name,
          address: values.address,
          is_active: values.is_active,
          work_schedule_json: workSchedule,
        }),
      );
    },
    [dashboard],
  );

  const submitQueue = useCallback(
    async (values: QueueFormValues) => {
      if (dashboard.editingQueue) {
        await makeRequest(
          dashboard.updateQueueMutation.mutateAsync({
            id: dashboard.editingQueue.id,
            payload: {
              branch: values.branch,
              name: values.name,
              language: values.language,
              clients_limit: values.clients_limit ?? null,
              called_ticket_timeout_seconds:
                values.called_ticket_timeout_seconds ?? null,
              notification_options: values.notification_options ?? {
                channels: [],
              },
              poster_title: values.poster_title ?? null,
              poster_subtitle: values.poster_subtitle ?? null,
              queue_url: values.queue_url ?? null,
            },
          }),
        );
        return;
      }

      await makeRequest(
        dashboard.createQueueMutation.mutateAsync({
          branch: values.branch,
          name: values.name,
          language: values.language,
          clients_limit: values.clients_limit,
          called_ticket_timeout_seconds:
            values.called_ticket_timeout_seconds ?? null,
          notification_options: values.notification_options ?? {
            channels: [],
          },
          poster_title: values.poster_title ?? null,
          poster_subtitle: values.poster_subtitle ?? null,
          queue_url: values.queue_url,
        }),
      );
    },
    [dashboard],
  );

  const submitFeedback = useCallback(
    async (values: FeedbackFormValues) => {
      const payload = {
        type: values.type,
        title: values.title,
        message: values.message,
        status: values.status,
        branch: values.branch ?? null,
        queue: values.queue ?? null,
      };

      if (dashboard.editingFeedback) {
        await makeRequest(
          dashboard.updateFeedbackMutation.mutateAsync({
            id: dashboard.editingFeedback.id,
            payload,
          }),
        );
        return;
      }

      await makeRequest(dashboard.createFeedbackMutation.mutateAsync(payload));
    },
    [dashboard],
  );

  const submitCompany = useCallback(
    async (values: CompanyFormValues) => {
      const company = dashboard.companies[0];
      if (!company) {
        return;
      }

      await makeRequest(
        dashboard.updateCompanyMutation.mutateAsync({
          id: company.id,
          payload: {
            name: values.name,
            timezone: values.timezone,
          },
        }),
      );
    },
    [dashboard],
  );

  const submitAdminSettings = useCallback(
    async (values: AdminSettingsFormValues) => {
      await makeRequest(
        dashboard.updateAdminSettingsMutation.mutateAsync({
          fullname: values.fullname,
          email: values.email,
          password: values.password || undefined,
          preferred_language: values.preferred_language,
        }),
      );
      dashboard.adminSettingsForm.setFieldValue("password", "");
    },
    [dashboard],
  );

  const assignOperatorToSelectedQueue = useCallback(() => {
    if (!dashboard.selectedOperatorForQueue || !dashboard.selectedQueue) {
      return;
    }

    const operator = dashboard.operators.find(
      (item) => item.id === dashboard.selectedOperatorForQueue,
    );
    const nextQueueIds = [
      ...(operator?.queues.map((item) => item.id) ?? []),
      dashboard.selectedQueue.id,
    ];

    makeRequest(
      dashboard.updateOperatorMutation.mutateAsync({
        id: dashboard.selectedOperatorForQueue,
        payload: { queue_ids: Array.from(new Set(nextQueueIds)) },
      }),
    );
    dashboard.setSelectedOperatorForQueue(null);
  }, [dashboard]);

  const unassignOperatorFromSelectedQueue = useCallback(
    (operator: AdminOperator) => {
      if (!dashboard.selectedQueue) {
        return;
      }

      makeRequest(
        dashboard.updateOperatorMutation.mutateAsync({
          id: operator.id,
          payload: {
            queue_ids: operator.queues
              .map((item) => item.id)
              .filter((id) => id !== dashboard.selectedQueue?.id),
          },
        }),
      );
    },
    [dashboard],
  );

  return {
    companyName,
    onLogout,
    onPreferredLanguageChange,
    openCreateBranch,
    openEditBranch,
    openCreateOperator,
    openEditOperator,
    openCreateQueue,
    openEditQueue,
    openCreateFeedback,
    openEditFeedback,
    openQueueDetails,
    closeQueueDetails,
    submitBranch,
    submitOperator,
    submitQueue,
    submitFeedback,
    submitCompany,
    submitAdminSettings,
    assignOperatorToSelectedQueue,
    unassignOperatorFromSelectedQueue,
  };
};
