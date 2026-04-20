import { operatorAuth } from "@apps/operator/helpers/auth";
import { useOperatorQueue } from "@apps/operator/store";
import { queryClient } from "@shared/api";
import { queueQueryOptions } from "@shared/entities/queue/api/queries";
import { makeRequest } from "@shared/helper/handler";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

export const useOperatorLayoutController = () => {
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

  const queueQuery = useQuery(
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
    if (queueQuery.data) {
      setQueue(queueQuery.data);
      i18n.changeLanguage(queueQuery.data.queue_language || "ru");
    }
  }, [i18n, queueQuery.data, setQueue]);

  const onLogout = async () => {
    try {
      await operatorAuth.logout();
    } finally {
      operatorAuth.clearToken();
      navigate("/o/login", { replace: true });
    }
  };

  const onLanguageChange = (value: "ru" | "en") => {
    i18n.changeLanguage(value);
    makeRequest(updateOperatorLanguageMutation.mutateAsync(value));
  };

  const onSubmitSettings = (
    payload: Parameters<typeof operatorAuth.updateQueueSettings>[1],
  ) => {
    if (!activeQueue) {
      return;
    }

    makeRequest(
      updateQueueMutation.mutateAsync({
        queueId: activeQueue.id,
        payload,
      }),
    );
  };

  const onOpenPoster = () => {
    if (!activeQueue) {
      return;
    }

    navigate(`/o/${activeQueue.id}/poster`);
  };

  const language: "ru" | "en" = i18n.language.startsWith("en")
    ? "en"
    : "ru";

  return {
    queues,
    activeQueue,
    activeQueueId: Number.isNaN(activeQueueId) ? null : activeQueueId,
    language,
    isSettingsOpen,
    setIsSettingsOpen,
    isQueuesLoading,
    queueContentLoading: queueQuery.isLoading,
    queueContentError: Boolean(queueQuery.error),
    settingsLoading: updateQueueMutation.isPending,
    onLogout,
    onLanguageChange,
    onSelectQueue: (selectedQueueId: string) => navigate(`/o/${selectedQueueId}`),
    onSubmitSettings,
    onOpenPoster,
  };
};
