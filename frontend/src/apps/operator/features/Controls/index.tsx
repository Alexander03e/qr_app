import styles from "./Controls.module.scss";
import { Button, Popconfirm, Typography } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DoubleRightOutlined,
  PlayCircleOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { Circle } from "@shared/components/Circle";
import cn from "classnames";
import { useTranslation } from "react-i18next";
import { useOperatorTicketActions } from "./hooks/useOperatorTicketActions";

export const Controls = () => {
  const { t } = useTranslation();
  const actions = useOperatorTicketActions();

  return (
    <div className={styles.container}>
      <Circle
        className={styles.ticketCircle}
        contentClassName={styles.currentTicketContent}
        isProgress={false}
        progressProps={{ percent: 100 }}
      >
        <Typography.Title
          className={cn(styles.currentTicketTitle, {
            [styles.noActiveTicket]: !actions.currentTicket,
          })}
          level={2}
        >
          {actions.currentTicket?.display_number ||
            t("operator.controls.emptyTicket")}
        </Typography.Title>
      </Circle>

      <div className={styles.controls}>
        {actions.currentTicket && (
          <div className={styles.lifecycleActions}>
            {actions.canStartService && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={actions.pendingAction === "start"}
                disabled={actions.isBusy}
                onClick={() => actions.startService()}
              >
                {t("operator.controls.startService")}
              </Button>
            )}

            {actions.canCompleteService && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={actions.pendingAction === "complete"}
                disabled={actions.isBusy}
                onClick={() => actions.completeService()}
              >
                {t("operator.controls.completeService")}
              </Button>
            )}

            {actions.canMarkNotArrived && (
              <Button
                danger
                icon={<CloseCircleOutlined />}
                loading={actions.pendingAction === "notArrived"}
                disabled={actions.isBusy}
                onClick={() => actions.markNotArrived()}
              >
                {t("operator.controls.notArrived")}
              </Button>
            )}

            {actions.canReturnToQueue && (
              <Button
                icon={<RollbackOutlined />}
                loading={actions.pendingAction === "return"}
                disabled={actions.isBusy}
                onClick={() => actions.returnToQueue()}
              >
                {t("operator.controls.returnToQueue")}
              </Button>
            )}

            {actions.canRemoveCurrent && (
              <Popconfirm
                title={t("operator.controls.removeConfirmTitle")}
                okText={t("operator.controls.removeConfirmOk")}
                cancelText={t("operator.controls.removeConfirmCancel")}
                onConfirm={() => actions.removeCurrent()}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={actions.pendingAction === "remove"}
                  disabled={actions.isBusy}
                >
                  {t("operator.controls.removeCurrent")}
                </Button>
              </Popconfirm>
            )}
          </div>
        )}

        {!actions.currentTicket && (
          <Typography.Title level={5} className={styles.readyTitle}>
            {t("operator.controls.readyForNext")}
          </Typography.Title>
        )}

        <Button
          type="primary"
          icon={<DoubleRightOutlined />}
          loading={actions.pendingAction === "next"}
          disabled={!actions.canInviteNext || actions.isBusy}
          onClick={() => actions.inviteNext()}
        >
          {t("operator.controls.next")}
        </Button>
      </div>
    </div>
  );
};
