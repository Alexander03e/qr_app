import {
  AlertOutlined,
  AreaChartOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  EditOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type {
  AdminFeedbackItem,
  AdminMetrics,
  AdminOperator,
  AdminQueue,
  FeedbackStatus,
  FeedbackType,
} from "@apps/admin/helpers/api";
import { adminApi } from "@apps/admin/helpers/api";
import type { AdminProfile } from "@apps/admin/helpers/auth";
import { adminAuth } from "@apps/admin/helpers/auth";
import { queryClient } from "@shared/api";
import { QueueSettingsPanel } from "@shared/components";
import { makeRequest } from "@shared/helper/handler";
import {
  Badge,
  Button,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Descriptions,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type SectionKey = "operators" | "queues" | "feedback" | "metrics" | "settings";

interface AdminDashboardProps {
  admin: AdminProfile;
}

const adminQueryKeys = {
  companies: ["admin", "companies"],
  branches: ["admin", "branches"],
  queues: ["admin", "queues"],
  operators: ["admin", "operators"],
  feedback: ["admin", "feedback"],
  metrics: ["admin", "metrics"],
  session: ["admin", "me"],
};

const feedbackStatusColors: Record<FeedbackStatus, string> = {
  NEW: "default",
  IN_PROGRESS: "processing",
  RESOLVED: "success",
};

const feedbackTypeColors: Record<FeedbackType, string> = {
  FEEDBACK: "blue",
  COMPLAINT: "volcano",
};

export const AdminDashboard = ({ admin }: AdminDashboardProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [currentAdmin, setCurrentAdmin] = useState(admin);
  const [activeSection, setActiveSection] = useState<SectionKey>("operators");

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [queueDetailsOpen, setQueueDetailsOpen] = useState(false);

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

  const [operatorForm] = Form.useForm<{
    fullname: string;
    email: string;
    password?: string;
    branch?: number;
    preferred_language: "ru" | "en";
    queue_ids?: number[];
    is_active: boolean;
  }>();

  const [queueForm] = Form.useForm<{
    branch: number;
    name: string;
    language: "ru" | "en";
    clients_limit?: number;
    called_ticket_timeout_seconds?: number;
    notification_options?: { channels: string[] };
    poster_title?: string;
    poster_subtitle?: string;
    queue_url?: string;
  }>();

  const [feedbackForm] = Form.useForm<{
    branch?: number;
    queue?: number;
    type: FeedbackType;
    title: string;
    message: string;
    status: FeedbackStatus;
  }>();

  const [companyForm] = Form.useForm<{
    name: string;
    timezone: string;
  }>();

  const [adminSettingsForm] = Form.useForm<{
    fullname: string;
    email: string;
    password?: string;
    preferred_language: "ru" | "en";
  }>();

  const { data: companies = [] } = useQuery({
    queryKey: adminQueryKeys.companies,
    queryFn: () => adminApi.getCompanies(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: adminQueryKeys.branches,
    queryFn: () => adminApi.getBranches(),
  });

  const { data: queues = [], isLoading: queuesLoading } = useQuery({
    queryKey: adminQueryKeys.queues,
    queryFn: () => adminApi.getQueues(),
  });

  const { data: operators = [], isLoading: operatorsLoading } = useQuery({
    queryKey: adminQueryKeys.operators,
    queryFn: () => adminApi.getOperators(),
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: adminQueryKeys.feedback,
    queryFn: () => adminApi.getFeedback(),
  });

  const { data: metrics } = useQuery<AdminMetrics>({
    queryKey: adminQueryKeys.metrics,
    queryFn: () => adminApi.getMetrics(),
    refetchInterval: 10000,
  });

  const createOperatorMutation = useMutation({
    mutationFn: adminApi.createOperator.bind(adminApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
      setOperatorModalOpen(false);
      setEditingOperator(null);
      operatorForm.resetFields();
      message.success(t("admin.messages.operatorCreated"));
    },
  });

  const updateOperatorMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof adminApi.updateOperator>[1];
    }) => adminApi.updateOperator(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
      setOperatorModalOpen(false);
      setEditingOperator(null);
      operatorForm.resetFields();
      message.success(t("admin.messages.operatorUpdated"));
    },
  });

  const deleteOperatorMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteOperator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.operators });
      message.success(t("admin.messages.operatorDeleted"));
    },
  });

  const createQueueMutation = useMutation({
    mutationFn: adminApi.createQueue.bind(adminApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
      setQueueModalOpen(false);
      setEditingQueue(null);
      queueForm.resetFields();
      message.success(t("admin.messages.queueCreated"));
    },
  });

  const updateQueueMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof adminApi.updateQueue>[1];
    }) => adminApi.updateQueue(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
      setQueueModalOpen(false);
      setEditingQueue(null);
      queueForm.resetFields();
      message.success(t("admin.messages.queueUpdated"));
    },
  });

  const deleteQueueMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteQueue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.queues });
      message.success(t("admin.messages.queueDeleted"));
    },
  });

  const createFeedbackMutation = useMutation({
    mutationFn: adminApi.createFeedback.bind(adminApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
      setFeedbackModalOpen(false);
      setEditingFeedback(null);
      feedbackForm.resetFields();
      message.success(t("admin.messages.feedbackCreated"));
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof adminApi.updateFeedback>[1];
    }) => adminApi.updateFeedback(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
      setFeedbackModalOpen(false);
      setEditingFeedback(null);
      feedbackForm.resetFields();
      message.success(t("admin.messages.feedbackUpdated"));
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback });
      message.success(t("admin.messages.feedbackDeleted"));
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof adminApi.updateCompany>[1];
    }) => adminApi.updateCompany(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.companies });
      message.success(t("admin.messages.companyUpdated"));
    },
  });

  const updateAdminSettingsMutation = useMutation({
    mutationFn: adminApi.updateAdminSettings.bind(adminApi),
    onSuccess: (
      response: Awaited<ReturnType<typeof adminApi.updateAdminSettings>>,
    ) => {
      setCurrentAdmin(response.admin);
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.session });
      message.success(t("admin.messages.adminUpdated"));
    },
  });

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
    queries: queues.map((queue) => ({
      queryKey: ["admin", "queue", queue.id, "snapshot"],
      queryFn: () => adminApi.getQueueSnapshot(queue.id),
      refetchInterval: 10000,
    })),
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

  const resolveOperatorLoad = (operator: AdminOperator) => {
    if (!operator.queues.length) {
      return { color: "default" as const, label: "Не назначен", waiting: 0 };
    }

    const waiting = operator.queues.reduce(
      (acc, queue) => acc + (queueWaitingMap.get(queue.id) ?? 0),
      0,
    );

    if (waiting === 0) {
      return { color: "success" as const, label: "Свободен", waiting };
    }

    if (waiting <= 5) {
      return { color: "processing" as const, label: "Умеренная", waiting };
    }

    if (waiting <= 12) {
      return { color: "warning" as const, label: "Высокая", waiting };
    }

    return { color: "error" as const, label: "Перегружен", waiting };
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

  const operatorsColumns: ColumnsType<AdminOperator> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      {
        title: t("admin.operators.fullname"),
        dataIndex: "fullname",
        key: "fullname",
      },
      { title: t("admin.operators.email"), dataIndex: "email", key: "email" },
      {
        title: "Очереди",
        key: "queues",
        render: (_, row) =>
          row.queues.length ? (
            <Space wrap>
              {row.queues.map((queue) => (
                <Tag key={queue.id}>{queue.name}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">Не назначен</Typography.Text>
          ),
      },
      {
        title: "Загруженность",
        key: "workload",
        render: (_, row) => {
          const load = resolveOperatorLoad(row);
          return (
            <Tooltip title={`Ожидают клиентов: ${load.waiting}`}>
              <Badge status={load.color} text={load.label} />
            </Tooltip>
          );
        },
      },
      {
        title: t("admin.operators.status"),
        dataIndex: "is_active",
        key: "is_active",
        render: (value: boolean) =>
          value ? (
            <Badge status="success" text={t("admin.common.active")} />
          ) : (
            <Badge status="default" text={t("admin.common.inactive")} />
          ),
      },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setEditingOperator(row);
                setOperatorModalOpen(true);
                operatorForm.setFieldsValue({
                  fullname: row.fullname,
                  email: row.email,
                  branch: row.branch ?? undefined,
                  preferred_language: row.preferred_language,
                  queue_ids: row.queues.map((item) => item.id),
                  is_active: row.is_active,
                });
              }}
            />
            <Popconfirm
              title={t("admin.common.deleteConfirm")}
              onConfirm={() =>
                makeRequest(deleteOperatorMutation.mutateAsync(row.id))
              }
            >
              <Button danger size="small">
                {t("admin.common.delete")}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleteOperatorMutation, operatorForm, t],
  );

  const queuesColumns: ColumnsType<AdminQueue> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      { title: t("admin.queues.name"), dataIndex: "name", key: "name" },
      { title: t("admin.queues.branch"), dataIndex: "branch", key: "branch" },
      {
        title: "Язык",
        dataIndex: "language",
        key: "language",
        render: (value: "ru" | "en") => (
          <Tag icon={<GlobalOutlined />}>{value.toUpperCase()}</Tag>
        ),
      },
      {
        title: t("admin.queues.limit"),
        dataIndex: "clients_limit",
        key: "clients_limit",
        render: (value: number | null) => value ?? "-",
      },
      {
        title: "Таймер",
        dataIndex: "called_ticket_timeout_seconds",
        key: "called_ticket_timeout_seconds",
        render: (value: number | null) =>
          value && value > 0 ? `${value} сек` : "Выключен",
      },
      {
        title: t("admin.queues.url"),
        dataIndex: "queue_url",
        key: "queue_url",
        render: (value: string | null) => value || "-",
      },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button
              icon={<InfoCircleOutlined />}
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedQueue(row);
                setQueueDetailsOpen(true);
              }}
            />
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                setEditingQueue(row);
                setQueueModalOpen(true);
                queueForm.setFieldsValue({
                  branch: row.branch ?? undefined,
                  name: row.name,
                  language: row.language,
                  clients_limit: row.clients_limit ?? undefined,
                  called_ticket_timeout_seconds:
                    row.called_ticket_timeout_seconds ?? undefined,
                  notification_options: {
                    channels: Array.isArray(row.notification_options?.channels)
                      ? row.notification_options.channels
                      : [],
                  },
                  poster_title: row.poster_title ?? undefined,
                  poster_subtitle: row.poster_subtitle ?? undefined,
                  queue_url: row.queue_url ?? undefined,
                });
              }}
            />
            <Popconfirm
              title={t("admin.common.deleteConfirm")}
              onConfirm={(event) => {
                event?.stopPropagation();
                return makeRequest(deleteQueueMutation.mutateAsync(row.id));
              }}
            >
              <Button danger size="small">
                {t("admin.common.delete")}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleteQueueMutation, queueForm, t],
  );

  const feedbackColumns: ColumnsType<AdminFeedbackItem> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      {
        title: t("admin.feedback.type"),
        dataIndex: "type",
        key: "type",
        render: (value: FeedbackType) => (
          <Tag color={feedbackTypeColors[value]}>{value}</Tag>
        ),
      },
      { title: t("admin.feedback.title"), dataIndex: "title", key: "title" },
      {
        title: t("admin.feedback.status"),
        dataIndex: "status",
        key: "status",
        render: (value: FeedbackStatus) => (
          <Tag color={feedbackStatusColors[value]}>{value}</Tag>
        ),
      },
      { title: t("admin.feedback.branch"), dataIndex: "branch", key: "branch" },
      { title: t("admin.feedback.queue"), dataIndex: "queue", key: "queue" },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setEditingFeedback(row);
                setFeedbackModalOpen(true);
                feedbackForm.setFieldsValue({
                  type: row.type,
                  title: row.title,
                  message: row.message,
                  status: row.status,
                  branch: row.branch ?? undefined,
                  queue: row.queue ?? undefined,
                });
              }}
            />
            <Popconfirm
              title={t("admin.common.deleteConfirm")}
              onConfirm={() =>
                makeRequest(deleteFeedbackMutation.mutateAsync(row.id))
              }
            >
              <Button danger size="small">
                {t("admin.common.delete")}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleteFeedbackMutation, feedbackForm, t],
  );

  const metricsColumns = useMemo<
    ColumnsType<AdminMetrics["endpoints"][number]>
  >(
    () => [
      {
        title: t("admin.metrics.method"),
        dataIndex: "method",
        key: "method",
        width: 120,
      },
      {
        title: t("admin.metrics.endpoint"),
        dataIndex: "endpoint",
        key: "endpoint",
      },
      {
        title: t("admin.metrics.requests"),
        dataIndex: "requests",
        key: "requests",
        width: 140,
      },
    ],
    [t],
  );

  const onLogout = async () => {
    try {
      await makeRequest(adminAuth.logout());
    } finally {
      adminAuth.clearToken();
      navigate("/a/login", { replace: true });
    }
  };

  const companyName = companies[0]?.name ?? t("admin.common.unknownCompany");

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider width={240} theme="light">
        <div style={{ padding: 16 }}>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>
            {t("admin.title")}
          </Typography.Title>
          <Typography.Text type="secondary">{companyName}</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeSection]}
          onSelect={(e) => setActiveSection(e.key as SectionKey)}
          items={[
            {
              key: "operators",
              icon: <TeamOutlined />,
              label: t("admin.menu.operators"),
            },
            {
              key: "queues",
              icon: <UnorderedListOutlined />,
              label: t("admin.menu.queues"),
            },
            {
              key: "feedback",
              icon: <AlertOutlined />,
              label: t("admin.menu.feedback"),
            },
            {
              key: "metrics",
              icon: <AreaChartOutlined />,
              label: t("admin.menu.metrics"),
            },
            {
              key: "settings",
              icon: <SettingOutlined />,
              label: t("admin.menu.settings"),
            },
          ]}
        />
      </Layout.Sider>

      <Layout>
        <Layout.Header
          style={{
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingInline: 24,
          }}
        >
          <Space>
            <Typography.Text strong>{currentAdmin.fullname}</Typography.Text>
            <Typography.Text type="secondary">
              {currentAdmin.email}
            </Typography.Text>
            <Select
              size="small"
              style={{ width: 120 }}
              value={currentAdmin.preferred_language}
              onChange={(value: "ru" | "en") => {
                i18n.changeLanguage(value);
                makeRequest(
                  updateAdminSettingsMutation.mutateAsync({
                    preferred_language: value,
                  }),
                );
              }}
              options={[
                { label: "RU", value: "ru" },
                { label: "EN", value: "en" },
              ]}
            />
          </Space>
          <Button onClick={onLogout}>{t("admin.common.logout")}</Button>
        </Layout.Header>

        <Layout.Content style={{ padding: 24 }}>
          <Space size={16} style={{ marginBottom: 20 }}>
            <Statistic
              title={t("admin.stats.operators")}
              value={operators.length}
            />
            <Statistic title={t("admin.stats.queues")} value={queues.length} />
            <Statistic
              title={t("admin.stats.feedback")}
              value={feedback.length}
            />
            <Statistic
              title={t("admin.metrics.totalRequests")}
              value={metrics?.total_requests ?? 0}
            />
          </Space>

          {activeSection === "operators" && (
            <>
              <Space style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingOperator(null);
                    operatorForm.resetFields();
                    operatorForm.setFieldValue("is_active", true);
                    operatorForm.setFieldValue("preferred_language", "ru");
                    operatorForm.setFieldValue("queue_ids", []);
                    setOperatorModalOpen(true);
                  }}
                >
                  {t("admin.operators.add")}
                </Button>
              </Space>
              <Table
                rowKey="id"
                loading={operatorsLoading}
                columns={operatorsColumns}
                dataSource={operators}
                pagination={false}
              />
            </>
          )}

          {activeSection === "queues" && (
            <>
              <Space style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingQueue(null);
                    queueForm.resetFields();
                    setQueueModalOpen(true);
                  }}
                >
                  {t("admin.queues.add")}
                </Button>
              </Space>
              <Table
                rowKey="id"
                loading={queuesLoading}
                columns={queuesColumns}
                dataSource={queues}
                pagination={false}
                onRow={(row) => ({
                  onClick: () => {
                    setSelectedQueue(row);
                    setQueueDetailsOpen(true);
                  },
                })}
              />
            </>
          )}

          {activeSection === "feedback" && (
            <>
              <Space style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingFeedback(null);
                    feedbackForm.resetFields();
                    feedbackForm.setFieldsValue({
                      type: "FEEDBACK",
                      status: "NEW",
                    });
                    setFeedbackModalOpen(true);
                  }}
                >
                  {t("admin.feedback.add")}
                </Button>
              </Space>
              <Table
                rowKey="id"
                loading={feedbackLoading}
                columns={feedbackColumns}
                dataSource={feedback}
                pagination={false}
              />
            </>
          )}

          {activeSection === "metrics" && (
            <>
              <Space size={16} style={{ marginBottom: 16 }}>
                <Statistic
                  title={t("admin.metrics.totalRequests")}
                  value={metrics?.total_requests ?? 0}
                />
                <Statistic
                  title={t("admin.metrics.errorRequests")}
                  value={metrics?.error_requests ?? 0}
                />
                <Statistic
                  title={t("admin.metrics.avgLatency")}
                  value={metrics?.avg_latency_ms ?? 0}
                  suffix="ms"
                />
              </Space>
              <Table
                rowKey={(row) => `${row.method}:${row.endpoint}`}
                columns={metricsColumns}
                dataSource={metrics?.endpoints ?? []}
                pagination={false}
              />
            </>
          )}

          {activeSection === "settings" && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {t("admin.settings.companyTitle")}
              </Typography.Title>
              <Form
                layout="vertical"
                form={companyForm}
                onFinish={async (values) => {
                  const company = companies[0];
                  if (!company) {
                    return;
                  }

                  await makeRequest(
                    updateCompanyMutation.mutateAsync({
                      id: company.id,
                      payload: {
                        name: values.name,
                        timezone: values.timezone,
                      },
                    }),
                  );
                }}
              >
                <Form.Item
                  name="name"
                  label={t("admin.companies.name")}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="timezone"
                  label={t("admin.companies.timezone")}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateCompanyMutation.isPending}
                >
                  {t("admin.settings.saveCompany")}
                </Button>
              </Form>

              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {t("admin.settings.adminTitle")}
              </Typography.Title>
              <Form
                layout="vertical"
                form={adminSettingsForm}
                onFinish={async (values) => {
                  await makeRequest(
                    updateAdminSettingsMutation.mutateAsync({
                      fullname: values.fullname,
                      email: values.email,
                      password: values.password || undefined,
                      preferred_language: values.preferred_language,
                    }),
                  );
                  adminSettingsForm.setFieldValue("password", "");
                }}
              >
                <Form.Item
                  name="fullname"
                  label={t("admin.operators.fullname")}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="email"
                  label={t("admin.operators.email")}
                  rules={[{ required: true, type: "email" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="password"
                  label={t("admin.settings.newPassword")}
                  rules={[{ min: 6 }]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item name="preferred_language" label="Язык интерфейса">
                  <Select
                    options={[
                      { label: "Русский", value: "ru" },
                      { label: "English", value: "en" },
                    ]}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateAdminSettingsMutation.isPending}
                >
                  {t("admin.settings.saveAdmin")}
                </Button>
              </Form>
            </Space>
          )}
        </Layout.Content>
      </Layout>

      <Modal
        title={
          editingOperator ? t("admin.operators.edit") : t("admin.operators.add")
        }
        open={operatorModalOpen}
        onCancel={() => {
          setOperatorModalOpen(false);
          setEditingOperator(null);
        }}
        onOk={() => operatorForm.submit()}
        confirmLoading={
          createOperatorMutation.isPending || updateOperatorMutation.isPending
        }
      >
        <Form
          layout="vertical"
          form={operatorForm}
          initialValues={{ is_active: true, preferred_language: "ru" }}
          onFinish={async (values) => {
            if (editingOperator) {
              await makeRequest(
                updateOperatorMutation.mutateAsync({
                  id: editingOperator.id,
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
              createOperatorMutation.mutateAsync({
                fullname: values.fullname,
                email: values.email,
                password: values.password || "",
                branch: values.branch,
                preferred_language: values.preferred_language,
                queue_ids: values.queue_ids ?? [],
                is_active: values.is_active,
              }),
            );
          }}
        >
          <Form.Item
            name="fullname"
            label={t("admin.operators.fullname")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label={t("admin.operators.email")}
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("admin.operators.password")}
            rules={
              editingOperator ? [{ min: 6 }] : [{ required: true, min: 6 }]
            }
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="branch" label={t("admin.operators.branch")}>
            <Select
              allowClear
              options={branches.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="preferred_language" label="Язык интерфейса">
            <Select
              options={[
                { label: "Русский", value: "ru" },
                { label: "English", value: "en" },
              ]}
            />
          </Form.Item>
          <Form.Item name="queue_ids" label="Назначенные очереди">
            <Select
              mode="multiple"
              allowClear
              options={queues.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label={t("admin.operators.status")}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("admin.queues.details")}
        open={queueDetailsOpen}
        onCancel={() => {
          setQueueDetailsOpen(false);
          setSelectedQueue(null);
        }}
        footer={null}
        width={860}
      >
        {selectedQueue ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="ID">
                {selectedQueue.id}
              </Descriptions.Item>
              <Descriptions.Item label={t("admin.queues.name")}>
                {selectedQueue.name}
              </Descriptions.Item>
              <Descriptions.Item label={t("admin.queues.branch")}>
                {branches.find((item) => item.id === selectedQueue.branch)
                  ?.name ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("admin.queues.limit")}>
                {selectedQueue.clients_limit ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("admin.queues.url")}>
                {selectedQueue.queue_url || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("admin.queues.lastTicket")}>
                {selectedQueue.last_ticket_number}
              </Descriptions.Item>
              <Descriptions.Item label={t("admin.queues.createdAt")}>
                {selectedQueue.created_at}
              </Descriptions.Item>
              <Descriptions.Item label={t("admin.queues.updatedAt")}>
                {selectedQueue.updated_at}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginBottom: 0 }}>
              {t("admin.queues.assignedOperators")}
            </Typography.Title>
            <Space>
              <Select
                style={{ minWidth: 280 }}
                placeholder={t("admin.queues.selectOperator")}
                value={selectedOperatorForQueue ?? undefined}
                onChange={(value) => setSelectedOperatorForQueue(value)}
                options={assignableOperators.map((item) => ({
                  label: `${item.fullname} (${item.email})`,
                  value: item.id,
                }))}
              />
              <Button
                type="primary"
                disabled={!selectedOperatorForQueue}
                onClick={() => {
                  if (!selectedOperatorForQueue) {
                    return;
                  }

                  const operator = operators.find(
                    (item) => item.id === selectedOperatorForQueue,
                  );
                  const nextQueueIds = [
                    ...(operator?.queues.map((item) => item.id) ?? []),
                    selectedQueue.id,
                  ];

                  makeRequest(
                    updateOperatorMutation.mutateAsync({
                      id: selectedOperatorForQueue,
                      payload: { queue_ids: Array.from(new Set(nextQueueIds)) },
                    }),
                  );
                  setSelectedOperatorForQueue(null);
                }}
              >
                {t("admin.queues.assign")}
              </Button>
            </Space>
            <Table
              rowKey="id"
              dataSource={selectedQueueOperators}
              pagination={false}
              columns={[
                {
                  title: t("admin.operators.fullname"),
                  dataIndex: "fullname",
                  key: "fullname",
                },
                {
                  title: t("admin.operators.email"),
                  dataIndex: "email",
                  key: "email",
                },
                {
                  title: t("admin.operators.status"),
                  dataIndex: "is_active",
                  key: "is_active",
                  render: (value: boolean) =>
                    value ? (
                      <Badge status="success" text={t("admin.common.active")} />
                    ) : (
                      <Badge
                        status="default"
                        text={t("admin.common.inactive")}
                      />
                    ),
                },
                {
                  title: t("admin.common.actions"),
                  key: "actions",
                  render: (_, row: AdminOperator) => (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingOperator(row);
                          setOperatorModalOpen(true);
                          operatorForm.setFieldsValue({
                            fullname: row.fullname,
                            email: row.email,
                            branch: row.branch ?? undefined,
                            preferred_language: row.preferred_language,
                            queue_ids: row.queues.map((item) => item.id),
                            is_active: row.is_active,
                          });
                        }}
                      >
                        {t("admin.operators.edit")}
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          makeRequest(
                            updateOperatorMutation.mutateAsync({
                              id: row.id,
                              payload: {
                                queue_ids: row.queues
                                  .map((item) => item.id)
                                  .filter((id) => id !== selectedQueue.id),
                              },
                            }),
                          )
                        }
                      >
                        {t("admin.queues.unassign")}
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />

            <Typography.Title level={5} style={{ marginBottom: 0 }}>
              Настройки очереди
            </Typography.Title>
            <QueueSettingsPanel
              queue={selectedQueue}
              loading={updateQueueMutation.isPending}
              submitText="Сохранить настройки"
              onSubmit={(payload) => {
                makeRequest(
                  updateQueueMutation.mutateAsync({
                    id: selectedQueue.id,
                    payload,
                  }),
                );
              }}
              onOpenPoster={() =>
                navigate(`/a/queues/${selectedQueue.id}/poster`)
              }
            />
          </Space>
        ) : null}
      </Modal>

      <Modal
        title={editingQueue ? t("admin.queues.edit") : t("admin.queues.add")}
        open={queueModalOpen}
        onCancel={() => {
          setQueueModalOpen(false);
          setEditingQueue(null);
        }}
        onOk={() => queueForm.submit()}
        confirmLoading={
          createQueueMutation.isPending || updateQueueMutation.isPending
        }
      >
        <Form
          layout="vertical"
          form={queueForm}
          onFinish={async (values) => {
            if (editingQueue) {
              await makeRequest(
                updateQueueMutation.mutateAsync({
                  id: editingQueue.id,
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
              createQueueMutation.mutateAsync({
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
          }}
        >
          <Form.Item
            name="branch"
            label={t("admin.queues.branch")}
            rules={[{ required: true }]}
          >
            <Select
              options={branches.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label={t("admin.queues.name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="language"
            label="Язык"
            initialValue="ru"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: "Русский", value: "ru" },
                { label: "English", value: "en" },
              ]}
            />
          </Form.Item>
          <Form.Item name="clients_limit" label={t("admin.queues.limit")}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="called_ticket_timeout_seconds"
            label="Таймер вызванного талона (сек)"
          >
            <InputNumber min={10} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name={["notification_options", "channels"]}
            label="Каналы уведомлений"
          >
            <Select
              mode="multiple"
              options={[
                { label: "SMS", value: "sms" },
                { label: "VK", value: "vk" },
                { label: "Bot", value: "bot" },
                { label: "Web Push", value: "webpush" },
              ]}
            />
          </Form.Item>
          <Form.Item name="poster_title" label="Заголовок плаката">
            <Input />
          </Form.Item>
          <Form.Item name="poster_subtitle" label="Подзаголовок плаката">
            <Input />
          </Form.Item>
          <Form.Item name="queue_url" label={t("admin.queues.url")}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          editingFeedback ? t("admin.feedback.edit") : t("admin.feedback.add")
        }
        open={feedbackModalOpen}
        onCancel={() => {
          setFeedbackModalOpen(false);
          setEditingFeedback(null);
        }}
        onOk={() => feedbackForm.submit()}
        confirmLoading={
          createFeedbackMutation.isPending || updateFeedbackMutation.isPending
        }
      >
        <Form
          layout="vertical"
          form={feedbackForm}
          onFinish={async (values) => {
            const payload = {
              type: values.type,
              title: values.title,
              message: values.message,
              status: values.status,
              branch: values.branch ?? null,
              queue: values.queue ?? null,
            };

            if (editingFeedback) {
              await makeRequest(
                updateFeedbackMutation.mutateAsync({
                  id: editingFeedback.id,
                  payload,
                }),
              );
              return;
            }

            await makeRequest(createFeedbackMutation.mutateAsync(payload));
          }}
        >
          <Form.Item
            name="type"
            label={t("admin.feedback.type")}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: "FEEDBACK", value: "FEEDBACK" },
                { label: "COMPLAINT", value: "COMPLAINT" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label={t("admin.feedback.status")}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: "NEW", value: "NEW" },
                { label: "IN_PROGRESS", value: "IN_PROGRESS" },
                { label: "RESOLVED", value: "RESOLVED" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label={t("admin.feedback.title")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="message"
            label={t("admin.feedback.message")}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="branch" label={t("admin.feedback.branch")}>
            <Select
              allowClear
              options={branches.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="queue" label={t("admin.feedback.queue")}>
            <Select
              allowClear
              options={queues.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};
