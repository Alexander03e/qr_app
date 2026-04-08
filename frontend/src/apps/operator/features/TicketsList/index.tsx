import { useOperatorQueue } from "@apps/operator/store";
import styles from "./TicketsList.module.scss";

export const TicketsList = () => {
  const { queueData } = useOperatorQueue();

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        Всего в очереди {queueData?.waiting_count}
      </div>
      <div className={styles.list}>
        {queueData?.waiting_tickets.map((ticket, index) => (
          <div className={styles.ticketItem} key={`ticket.${ticket.id}`}>
            {index + 1}. {ticket.display_number}
          </div>
        ))}
      </div>
    </div>
  );
};
