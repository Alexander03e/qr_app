import { useQuery } from "@tanstack/react-query";
import styles from "./Board.module.scss";
import { queueQueryOptions } from "@shared/entities/queue/api/queries";
import { useParams, useSearchParams } from "react-router-dom";
import { Error } from "@shared/components";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { Circle } from "@apps/client/components";
import { TICKET_STATUS } from "@shared/entities/queue/types/enum";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_CALLED_TIMEOUT_SECONDS } from "@shared/consts";

const formatDuration = (seconds: number): string => {
  const safeValue = Math.max(seconds, 0);
  const minutes = Math.floor(safeValue / 60);
  const restSeconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
};
import cn from "classnames";

export const Board = () => {
  const { queueId } = useParams();
  const [searchParams] = useSearchParams();
  const isCircle =
    searchParams.get("circle") === "1" || searchParams.get("circle") === "true";

  const [currentTs, setCurrentTs] = useState<number>(() => Date.now());
  const [calledCountdownBase, setCalledCountdownBase] = useState<{
    remainingSeconds: number;
    startedAtTs: number;
  } | null>(null);

  const { data, isPending, error } = useQuery(
    queueQueryOptions.getQueue(queueId!, null, {
      enabled: !!queueId,
    }),
  );

  const firstTicket = data?.waiting_tickets?.[0];
  const currentTicket = data?.current_ticket;
  const isCalled = currentTicket?.status === TICKET_STATUS.CALLED;
  const isInService = currentTicket?.status === TICKET_STATUS.IN_SERVICE;

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!isCalled) {
      setCalledCountdownBase(null);
      return;
    }

    if (typeof data?.client_called_remaining_seconds === "number") {
      setCalledCountdownBase({
        remainingSeconds: data.client_called_remaining_seconds,
        startedAtTs: Date.now(),
      });
    }
  }, [data?.client_called_remaining_seconds, isCalled, currentTicket?.id]);

  const calledTimeoutSeconds =
    data?.called_ticket_timeout_seconds ?? CLIENT_CALLED_TIMEOUT_SECONDS;
  const calledRemainingSeconds = useMemo(() => {
    if (!isCalled || !currentTicket) {
      return null;
    }

    if (calledCountdownBase) {
      const elapsedSeconds = Math.floor(
        (currentTs - calledCountdownBase.startedAtTs) / 1000,
      );
      return Math.max(calledCountdownBase.remainingSeconds - elapsedSeconds, 0);
    }

    const calledAtMs = new Date(currentTicket.updated_at).getTime();
    const elapsedSeconds = Math.floor((currentTs - calledAtMs) / 1000);
    return Math.max(calledTimeoutSeconds - elapsedSeconds, 0);
  }, [
    calledCountdownBase,
    calledTimeoutSeconds,
    currentTs,
    isCalled,
    currentTicket,
  ]);

  const statusLabel = currentTicket
    ? isCalled
      ? "Ожидает подхода клиента"
      : isInService
        ? "Обслуживается"
        : "Ожидает вызова"
    : "Нет текущего талона";
  const showTimer = isCalled && calledRemainingSeconds !== null;
  const safeCalledTimeoutSeconds = Math.max(calledTimeoutSeconds, 1);
  const percent = isCalled
    ? Math.max(
        (Number(calledRemainingSeconds ?? 0) * 100) / safeCalledTimeoutSeconds,
        0,
      )
    : isInService
      ? 100
      : 0;

  if (isPending) {
    return <Spin spinning indicator={<LoadingOutlined />} fullscreen />;
  }

  if (!data || error) {
    return <Error title={"Произошла ошибка"} />;
  }

  const defaultStatusLabel =
    data.current_ticket?.status === TICKET_STATUS.CALLED
      ? "Ожидает подхода клиента"
      : data.current_ticket?.status === TICKET_STATUS.IN_SERVICE
        ? "Обслуживается"
        : "Пожалуйста, подождите";

  return (
    <div className={styles.board}>
      <div className={styles.currentPanel}>
        {!isCircle && (
          <div className={styles.panelLabel}>{defaultStatusLabel}</div>
        )}
        {isCircle && <div className={styles.circleStatus}>{statusLabel}</div>}

        {isCircle ? (
          <Circle
            color={"default"}
            progressProps={{ percent, strokeWidth: 5 }}
            className={styles.currentCircle}
            contentClassName={styles.circleContent}
          >
            <div className={styles.circleNumber}>
              {currentTicket?.display_number ?? "-"}
            </div>
            {showTimer ? (
              <div className={styles.circleTimer}>
                {formatDuration(calledRemainingSeconds ?? 0)}
              </div>
            ) : null}
          </Circle>
        ) : (
          <>
            {currentTicket?.display_number && (
              <div className={styles.panelNumber}>
                {currentTicket?.display_number}
              </div>
            )}

            {showTimer ? (
              <div className={styles.statusTimer}>
                {formatDuration(calledRemainingSeconds ?? 0)}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className={styles.rightColumn}>
        <div className={cn(styles.panelBase, styles.queuePanel)}>
          <div className={styles.queueBlock}>
            <div className={styles.queueTitle}>Следующий</div>
            <div className={styles.ticket}>
              {firstTicket?.display_number ?? "-"}
            </div>
          </div>
          <div className={styles.queueBlock}>
            <div className={styles.queueTitle}>В очереди</div>
            <div className={styles.queueList}>
              {data?.waiting_tickets?.slice(1)?.map((ticket) => (
                <div key={ticket.id} className={styles.ticket}>
                  {ticket?.display_number}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
