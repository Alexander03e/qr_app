import { operatorAuth } from "@apps/operator/helpers/auth";
import { QueuePosterEditor } from "@shared/components";
import { makeRequest } from "@shared/helper/handler";
import { useQuery } from "@tanstack/react-query";
import { Result, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";

export const OperatorPosterPage = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();

  const parsedQueueId = Number(queueId);
  const { data: queues, isLoading } = useQuery({
    queryKey: ["operator", "queues"],
    queryFn: () => operatorAuth.getQueues(),
  });

  if (isLoading) {
    return <Spin />;
  }

  const queue = queues?.find((item) => item.id === parsedQueueId);
  if (!queue) {
    return <Result status="404" title="Очередь не найдена" />;
  }

  return (
    <QueuePosterEditor
      value={{
        queueId: queue.id,
        queueName: queue.name,
        queueUrl: queue.queue_url || `${window.location.origin}/c/${queue.id}`,
        posterTitle: queue.poster_title,
        posterSubtitle: queue.poster_subtitle,
      }}
      onSave={(payload) =>
        makeRequest(operatorAuth.updateQueueSettings(queue.id, payload)).then(
          () => undefined,
        )
      }
      onBack={() => navigate(`/o/${queue.id}`, { replace: false })}
    />
  );
};
