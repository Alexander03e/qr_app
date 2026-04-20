import { adminApi } from "@shared/entities/admin/api";
import { adminQueryOptions } from "@shared/entities/admin/api/queries";
import { QueuePosterEditor } from "@shared/components";
import { makeRequest } from "@shared/helper/handler";
import { useQuery } from "@tanstack/react-query";
import { Result, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";

export const AdminPosterPage = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();

  const parsedQueueId = Number(queueId);
  const { data, isLoading } = useQuery(
    adminQueryOptions.queueById(parsedQueueId),
  );

  if (isLoading) {
    return <Spin />;
  }

  if (!data) {
    return <Result status="404" title="Очередь не найдена" />;
  }

  return (
    <QueuePosterEditor
      value={{
        queueId: data.id,
        queueName: data.name,
        queueUrl: data.queue_url || `${window.location.origin}/c/${data.id}`,
        posterTitle: data.poster_title,
        posterSubtitle: data.poster_subtitle,
      }}
      onSave={(payload) =>
        makeRequest(adminApi.updateQueue(data.id, payload)).then(
          () => undefined,
        )
      }
      onBack={() => navigate("/a", { replace: false })}
    />
  );
};
