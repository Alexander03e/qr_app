import { useOperatorQueue } from "@apps/operator/store";
import styles from "./Controls.module.scss";
import { Button, Typography } from "antd";
import { useMutation } from "@tanstack/react-query";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { TICKET_STATUS } from "@shared/entities/queue/types/enum";
import { operatorAuth } from "@apps/operator/helpers/auth";
import { useNavigate } from "react-router-dom";
export const Controls = () => {
  const navigate = useNavigate();
  const { queueData, queueId, setQueue } = useOperatorQueue();

  const { mutate: inviteNext } = useMutation(
    queueMutationOptions.inviteNext({
      onSuccess: (data) => {
        setQueue(data.queue_snapshot);
      },
    }),
  );

  const { mutate: updateStatus } = useMutation(
    queueMutationOptions.updateTicketStatus({
      onSuccess: (data) => {
        setQueue(data.queue_snapshot);
      },
    }),
  );

  const handleNext = () => {
    if (!queueId) return;

    inviteNext(queueId);
  };

  const handleReturnToQueue = () => {
    if (!queueId || !queueData?.current_ticket) return;

    updateStatus({
      ticketId: queueData.current_ticket.id,
      status: TICKET_STATUS.WAITING,
    });
  };

  const handleLogout = async () => {
    try {
      await operatorAuth.logout();
    } finally {
      operatorAuth.clearToken();
      navigate("/o/login", { replace: true });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        {queueData?.current_ticket ? (
          <>
            <p>Текущий талон:</p>
            <div className={styles.currentTicket}>
              <Typography color="green">
                {queueData?.current_ticket?.display_number}
              </Typography>
            </div>
          </>
        ) : (
          <p>Активного талона нет</p>
        )}
      </div>
      <div className={styles.controls}>
        <Button onClick={handleReturnToQueue}>Вернуть в очередь</Button>
        <Button onClick={handleNext}>Следующий</Button>
        <Button danger onClick={handleLogout}>
          Выйти
        </Button>
      </div>
    </div>
  );
};
