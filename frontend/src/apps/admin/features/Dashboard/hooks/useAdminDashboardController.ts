import type {
  AdminBranch,
  AdminFeedbackItem,
  AdminOperator,
  AdminQueue,
} from "@shared/entities/admin/types";
import { adminMutationOptions } from "@shared/entities/admin/api/mutations";
import { adminQueryOptions } from "@shared/entities/admin/api/queries";
import type { AdminProfile } from "@apps/admin/helpers/auth";
import { Form, message } from "antd";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  AdminSettingsFormValues,
  BranchFormValues,
  CompanyFormValues,
  FeedbackFormValues,
  OperatorFormValues,
  OperatorLoadInfo,
  QueueFormValues,
} from "../types";

interface UseAdminDashboardControllerParams {
  admin: AdminProfile;
}

export const useAdminDashboardController = ({
  admin,
}: UseAdminDashboardControllerParams) => {
  const { t, i18n } = useTranslation();

  const [currentAdmin, setCurrentAdmin] = useState(admin);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [queueDetailsOpen, setQueueDetailsOpen] = useState(false);

  const [editingBranch, setEditingBranch] = useState<AdminBranch | null>(null);
  const [editingOperator, setEditingOperator] = useState<AdminOperator | null>(
    null,
  );
  const [editingQueue, setEditingQueue] = useState<AdminQueue | null>(null);
  const [editingFeedback, setEditingFeedback] =
    useState<AdminFeedbackItem | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<AdminQueue | null>(null);
  const [selectedOperatorForQueue, setSelectedOperatorForQueue] = useState<
    number | null
  >(null);

  const [branchForm] = Form.useForm<BranchFormValues>();
  const [operatorForm] = Form.useForm<OperatorFormValues>();
  const [queueForm] = Form.useForm<QueueFormValues>();
  const [feedbackForm] = Form.useForm<FeedbackFormValues>();
  const [companyForm] = Form.useForm<CompanyFormValues>();
  const [adminSettingsForm] = Form.useForm<AdminSettingsFormValues>();

  const { data: companies = [] } = useQuery(adminQueryOptions.companies());
  const { data: branches = [], isLoading: branchesLoading } = useQuery(
    adminQueryOptions.branches(),
  );
  const { data: queues = [], isLoading: queuesLoading } = useQuery(
    adminQueryOptions.queues(),
  );
  const { data: operators = [], isLoading: operatorsLoading } = useQuery(
    adminQueryOptions.operators(),
  );
  const { data: feedback = [], isLoading: feedbackLoading } = useQuery(
    adminQueryOptions.feedback(),
  );
  const { data: metrics } = useQuery(adminQueryOptions.metrics());

  const createOperatorMutation = useMutation(
    adminMutationOptions.createOperator({
      onSuccess: () => {
        setOperatorModalOpen(false);
        setEditingOperator(null);
        operatorForm.resetFields();
        message.success(t("admin.messages.operatorCreated"));
      },
    }),
  );

  const updateOperatorMutation = useMutation(
    adminMutationOptions.updateOperator({
      onSuccess: () => {
        setOperatorModalOpen(false);
        setEditingOperator(null);
        operatorForm.resetFields();
        message.success(t("admin.messages.operatorUpdated"));
      },
    }),
  );

  const deleteOperatorMutation = useMutation(
    adminMutationOptions.deleteOperator({
      onSuccess: () => {
        message.success(t("admin.messages.operatorDeleted"));
      },
    }),
  );

  const createBranchMutation = useMutation(
    adminMutationOptions.createBranch({
      onSuccess: () => {
        setBranchModalOpen(false);
        setEditingBranch(null);
        branchForm.resetFields();
        message.success(t("admin.messages.branchCreated"));
      },
    }),
  );

  const updateBranchMutation = useMutation(
    adminMutationOptions.updateBranch({
      onSuccess: () => {
        setBranchModalOpen(false);
        setEditingBranch(null);
        branchForm.resetFields();
        message.success(t("admin.messages.branchUpdated"));
      },
    }),
  );

  const deleteBranchMutation = useMutation(
    adminMutationOptions.deleteBranch({
      onSuccess: () => {
        message.success(t("admin.messages.branchDeleted"));
      },
    }),
  );

  const createQueueMutation = useMutation(
    adminMutationOptions.createQueue({
      onSuccess: () => {
        setQueueModalOpen(false);
        setEditingQueue(null);
        queueForm.resetFields();
        message.success(t("admin.messages.queueCreated"));
      },
    }),
  );

  const updateQueueMutation = useMutation(
    adminMutationOptions.updateQueue({
      onSuccess: () => {
        setQueueModalOpen(false);
        setEditingQueue(null);
        queueForm.resetFields();
        message.success(t("admin.messages.queueUpdated"));
      },
    }),
  );

  const deleteQueueMutation = useMutation(
    adminMutationOptions.deleteQueue({
      onSuccess: () => {
        message.success(t("admin.messages.queueDeleted"));
      },
    }),
  );

  const createFeedbackMutation = useMutation(
    adminMutationOptions.createFeedback({
      onSuccess: () => {
        setFeedbackModalOpen(false);
        setEditingFeedback(null);
        feedbackForm.resetFields();
        message.success(t("admin.messages.feedbackCreated"));
      },
    }),
  );

  const updateFeedbackMutation = useMutation(
    adminMutationOptions.updateFeedback({
      onSuccess: () => {
        setFeedbackModalOpen(false);
        setEditingFeedback(null);
        feedbackForm.resetFields();
        message.success(t("admin.messages.feedbackUpdated"));
      },
    }),
  );

  const deleteFeedbackMutation = useMutation(
    adminMutationOptions.deleteFeedback({
      onSuccess: () => {
        message.success(t("admin.messages.feedbackDeleted"));
      },
    }),
  );

  const updateCompanyMutation = useMutation(
    adminMutationOptions.updateCompany({
      onSuccess: () => {
        message.success(t("admin.messages.companyUpdated"));
      },
    }),
  );

  const updateAdminSettingsMutation = useMutation(
    adminMutationOptions.updateAdminSettings({
      onSuccess: (response) => {
        setCurrentAdmin(response.admin);
        message.success(t("admin.messages.adminUpdated"));
      },
    }),
  );

  const selectedQueueOperators = useMemo(() => {
    if (!selectedQueue) {
      return [];
    }

    return operators.filter((item) =>
      item.queues.some((queue) => queue.id === selectedQueue.id),
    );
  }, [operators, selectedQueue]);

  const assignableOperators = useMemo(() => {
    if (!selectedQueue) {
      return [];
    }

    return operators.filter(
      (item) => !item.queues.some((queue) => queue.id === selectedQueue.id),
    );
  }, [operators, selectedQueue]);

  const queueSnapshotsQueries = useQueries({
    queries: queues.map((queue) => adminQueryOptions.queueSnapshot(queue.id)),
  });

  const queueWaitingMap = useMemo(() => {
    const map = new Map<number, number>();
    queueSnapshotsQueries.forEach((query, index) => {
      if (query.data?.queue_id) {
        map.set(query.data.queue_id, query.data.waiting_count);
        return;
      }

      const fallbackQueue = queues[index];
      if (fallbackQueue) {
        map.set(fallbackQueue.id, 0);
      }
    });

    return map;
  }, [queueSnapshotsQueries, queues]);

  const resolveOperatorLoad = (operator: AdminOperator): OperatorLoadInfo => {
    if (!operator.queues.length) {
      return { color: "default", label: "Не назначен", waiting: 0 };
    }

    const waiting = operator.queues.reduce(
      (acc, queue) => acc + (queueWaitingMap.get(queue.id) ?? 0),
      0,
    );

    if (waiting === 0) {
      return { color: "success", label: "Свободен", waiting };
    }

    if (waiting <= 5) {
      return { color: "processing", label: "Умеренная", waiting };
    }

    if (waiting <= 12) {
      return { color: "warning", label: "Высокая", waiting };
    }

    return { color: "error", label: "Перегружен", waiting };
  };

  useEffect(() => {
    const company = companies[0];
    if (!company) {
      return;
    }

    companyForm.setFieldsValue({
      name: company.name,
      timezone: company.timezone,
    });
  }, [companies, companyForm]);

  useEffect(() => {
    adminSettingsForm.setFieldsValue({
      fullname: currentAdmin.fullname,
      email: currentAdmin.email,
      password: "",
      preferred_language: currentAdmin.preferred_language,
    });
  }, [adminSettingsForm, currentAdmin]);

  useEffect(() => {
    i18n.changeLanguage(currentAdmin.preferred_language || "ru");
  }, [currentAdmin.preferred_language, i18n]);

  return {
    t,
    i18n,
    currentAdmin,
    branchModalOpen,
    setBranchModalOpen,
    operatorModalOpen,
    setOperatorModalOpen,
    queueModalOpen,
    setQueueModalOpen,
    feedbackModalOpen,
    setFeedbackModalOpen,
    queueDetailsOpen,
    setQueueDetailsOpen,
    editingBranch,
    setEditingBranch,
    editingOperator,
    setEditingOperator,
    editingQueue,
    setEditingQueue,
    editingFeedback,
    setEditingFeedback,
    selectedQueue,
    setSelectedQueue,
    selectedOperatorForQueue,
    setSelectedOperatorForQueue,
    branchForm,
    operatorForm,
    queueForm,
    feedbackForm,
    companyForm,
    adminSettingsForm,
    companies,
    branches,
    branchesLoading,
    queues,
    queuesLoading,
    operators,
    operatorsLoading,
    feedback,
    feedbackLoading,
    metrics,
    createOperatorMutation,
    updateOperatorMutation,
    deleteOperatorMutation,
    createBranchMutation,
    updateBranchMutation,
    deleteBranchMutation,
    createQueueMutation,
    updateQueueMutation,
    deleteQueueMutation,
    createFeedbackMutation,
    updateFeedbackMutation,
    deleteFeedbackMutation,
    updateCompanyMutation,
    updateAdminSettingsMutation,
    selectedQueueOperators,
    assignableOperators,
    resolveOperatorLoad,
  };
};
