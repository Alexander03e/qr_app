import { LoadingOutlined, SettingOutlined } from "@ant-design/icons";
import { queueQueryOptions } from "@shared/entities/queue/api/queries";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useOperatorQueue } from "./store";
import styles from "./OperatorApp.module.scss";
import { TicketsList } from "./features/TicketsList";
import { Controls } from "./features/Controls";
import { QrCode } from "./features/QrCode";
import { OperatorLogin } from "./features/Login";
import { OperatorPosterPage } from "./features/Poster";
import { operatorAuth } from "./helpers/auth";
import {
  Button,
  Drawer,
  Empty,
  Layout,
  Menu,
  Select,
  Spin,
  Typography,
} from "antd";
import { QueueSettingsPanel } from "@shared/components";
import { makeRequest } from "@shared/helper/handler";
import { queryClient } from "@shared/api";
import { useTranslation } from "react-i18next";

export const OperatorAppInner = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { queueId } = useParams();
  const { setQueue, setQueueId } = useOperatorQueue();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: queues = [], isLoading: isQueuesLoading } = useQuery({
    queryKey: ["operator", "queues"],
    queryFn: () => operatorAuth.getQueues(),
  });

  const activeQueueId = useMemo(() => Number(queueId), [queueId]);
  const activeQueue = useMemo(
    () => queues.find((item) => item.id === activeQueueId),
    [activeQueueId, queues],
  );

  const { data, isLoading, error } = useQuery(
    queueQueryOptions.getQueue(activeQueueId, null, {
      enabled: Boolean(activeQueueId) && Boolean(activeQueue),
    }),
  );

  const updateQueueMutation = useMutation({
    mutationFn: ({
      queueId,
      payload,
    }: {
      queueId: number;
      payload: Parameters<typeof operatorAuth.updateQueueSettings>[1];
    }) => operatorAuth.updateQueueSettings(queueId, payload),
    onSuccess: (updatedQueue) => {
      queryClient.invalidateQueries({ queryKey: ["operator", "queues"] });
      queryClient.invalidateQueries({
        queryKey: ["queue", updatedQueue.id, "anonymous"],
      });
      setIsSettingsOpen(false);
    },
  });

  const updateOperatorLanguageMutation = useMutation({
    mutationFn: (language: "ru" | "en") =>
      operatorAuth.updateSettings({ preferred_language: language }),
    onSuccess: (response) => {
      i18n.changeLanguage(response.operator.preferred_language);
      queryClient.invalidateQueries({ queryKey: ["operator", "me"] });
    },
  });

  useEffect(() => {
    if (queues.length === 0 || !Number.isNaN(activeQueueId) || queueId) {
      return;
    }

    navigate(`/o/${queues[0].id}`, { replace: true });
  }, [activeQueueId, navigate, queueId, queues]);

  useEffect(() => {
    if (!activeQueueId || Number.isNaN(activeQueueId)) {
      return;
    }

    setQueueId(activeQueueId);
  }, [activeQueueId, setQueueId]);

  useEffect(() => {
    if (data) {
      setQueue(data);
      i18n.changeLanguage(data.queue_language || "ru");
    }
  }, [data, i18n, setQueue]);

  if (isQueuesLoading) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  if (!queues.length) {
    return (
      <div className={styles.emptyState}>
        <Empty description="Оператор не назначен ни на одну очередь" />
        <Button
          danger
          onClick={async () => {
            try {
              await operatorAuth.logout();
            } finally {
              operatorAuth.clearToken();
              navigate("/o/login", { replace: true });
            }
          }}
        >
          Выйти
        </Button>
      </div>
    );
  }

  return (
    <Layout className={styles.layout}>
      <Layout.Sider width={280} theme="light" className={styles.sider}>
        <div className={styles.siderTop}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Очереди оператора
          </Typography.Title>
          <Typography.Text type="secondary">
            {queues.length} шт.
          </Typography.Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={activeQueue ? [String(activeQueue.id)] : []}
          items={queues.map((queue) => ({
            key: String(queue.id),
            label: (
              <div className={styles.queueMenuItem}>
                <span>{queue.name}</span>
                <Typography.Text type="secondary">#{queue.id}</Typography.Text>
              </div>
            ),
          }))}
          onSelect={(event) => navigate(`/o/${event.key}`)}
        />
      </Layout.Sider>

      <Layout>
        <Layout.Header className={styles.header}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {activeQueue?.name || "Очередь"}
            </Typography.Title>
            <Typography.Text type="secondary">
              Управление талонами и настройками
            </Typography.Text>
          </div>
          <div className={styles.headerActions}>
            <Select
              size="small"
              style={{ width: 110 }}
              value={i18n.language.startsWith("en") ? "en" : "ru"}
              options={[
                { label: "RU", value: "ru" },
                { label: "EN", value: "en" },
              ]}
              onChange={(value: "ru" | "en") => {
                i18n.changeLanguage(value);
                makeRequest(updateOperatorLanguageMutation.mutateAsync(value));
              }}
            />
            <Button
              icon={<SettingOutlined />}
              onClick={() => setIsSettingsOpen(true)}
            >
              Настройки
            </Button>
          </div>
        </Layout.Header>

        <Layout.Content className={styles.content}>
          {isLoading && <Spin indicator={<LoadingOutlined spin />} />}
          {!isLoading && !error ? (
            <div className={styles.grid}>
              <TicketsList />
              <div className={styles.rightColumn}>
                <Controls />
                <QrCode />
              </div>
            </div>
          ) : null}
        </Layout.Content>
      </Layout>

      <Drawer
        title="Настройки очереди"
        width={460}
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      >
        {activeQueue ? (
          <QueueSettingsPanel
            queue={activeQueue}
            loading={updateQueueMutation.isPending}
            onSubmit={(payload) => {
              makeRequest(
                updateQueueMutation.mutateAsync({
                  queueId: activeQueue.id,
                  payload,
                }),
              );
            }}
            onOpenPoster={() => navigate(`/o/${activeQueue.id}/poster`)}
          />
        ) : null}
      </Drawer>
    </Layout>
  );
};

export const OperatorApp = () => {
  const location = useLocation();
  const token = operatorAuth.readToken();
  const isLoginRoute = location.pathname.startsWith("/o/login");

  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ["operator", "me", token],
    queryFn: () => operatorAuth.me(),
    enabled: Boolean(token) && !isLoginRoute,
    retry: false,
  });

  useEffect(() => {
    if (sessionError) {
      operatorAuth.clearToken();
    }
  }, [sessionError]);

  if (token && !isLoginRoute && isSessionLoading) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  const isAuthorized = Boolean(token) && Boolean(sessionData?.operator);
  const nextUrl = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <Routes>
      <Route path="/login" element={<OperatorLogin />} />
      <Route
        path="/:queueId/poster"
        element={
          isAuthorized ? (
            <OperatorPosterPage />
          ) : (
            <Navigate replace to={`/o/login?next=${nextUrl}`} />
          )
        }
      />
      <Route
        path="/:queueId"
        element={
          isAuthorized ? (
            <OperatorAppInner />
          ) : (
            <Navigate replace to={`/o/login?next=${nextUrl}`} />
          )
        }
      />
      <Route
        path="/"
        element={
          isAuthorized ? (
            <OperatorAppInner />
          ) : (
            <Navigate replace to={`/o/login?next=${nextUrl}`} />
          )
        }
      />
    </Routes>
  );
};
