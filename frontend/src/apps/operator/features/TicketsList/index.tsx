import { useOperatorQueue } from "@apps/operator/store";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { makeRequest } from "@shared/helper/handler";
import { useMutation } from "@tanstack/react-query";
import { Button, Modal, Space } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./TicketsList.module.scss";

export const TicketsList = () => {
  const { queueData, setQueue } = useOperatorQueue();
  const { t } = useTranslation();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  const { mutateAsync: inviteById, isPending: isInvitePending } = useMutation(
    queueMutationOptions.inviteById({
      onSuccess: (data) => {
        setQueue(data.queue_snapshot);
      },
    }),
  );

  const { mutateAsync: removeTicket, isPending: isRemovePending } = useMutation(
    queueMutationOptions.removeTicket({
      onSuccess: (data) => {
        setQueue(data.queue_snapshot);
      },
    }),
  );

  const handleInviteById = (ticketId: number) => {
    if (queueData?.current_ticket) {
      setSelectedTicketId(ticketId);
      setIsActionModalOpen(true);
      return;
    }

    makeRequest(inviteById({ ticketId }));
  };

  const handleRemoveTicket = (ticketId: number) => {
    makeRequest(removeTicket(ticketId));
  };

  const handleModalAction = (action: "complete" | "return") => {
    if (!selectedTicketId) {
      return;
    }

    makeRequest(
      inviteById({ ticketId: selectedTicketId, payload: { action } }),
    );
    setIsActionModalOpen(false);
    setSelectedTicketId(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        Всего в очереди {queueData?.waiting_count}
      </div>
      <div className={styles.list}>
        {queueData?.waiting_tickets.map((ticket, index) => (
          <div className={styles.ticketItem} key={`ticket.${ticket.id}`}>
            <span>
              {index + 1}. {ticket.display_number}
            </span>
            <Space>
              <Button
                size="small"
                onClick={() => handleInviteById(ticket.id)}
                loading={isInvitePending}
              >
                {t("operator.tickets.invite")}
              </Button>
              <Button
                danger
                size="small"
                onClick={() => handleRemoveTicket(ticket.id)}
                loading={isRemovePending}
              >
                {t("operator.tickets.remove")}
              </Button>
            </Space>
          </div>
        ))}
      </div>
      <Modal
        title={t("operator.tickets.needActionTitle")}
        open={isActionModalOpen}
        onCancel={() => {
          setIsActionModalOpen(false);
          setSelectedTicketId(null);
        }}
        footer={null}
      >
        <p>{t("operator.tickets.needActionDescription")}</p>
        <Space>
          <Button onClick={() => handleModalAction("complete")}>
            {t("operator.tickets.complete")}
          </Button>
          <Button onClick={() => handleModalAction("return")} type="primary">
            {t("operator.tickets.return")}
          </Button>
        </Space>
      </Modal>
    </div>
  );
};
