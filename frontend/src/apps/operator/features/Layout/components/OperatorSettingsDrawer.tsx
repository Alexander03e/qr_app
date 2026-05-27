import { QueueSettingsPanel } from "@shared/components";
import { Drawer } from "antd";
import { useOperatorLayoutContext } from "../context/useOperatorLayoutContext";

export const OperatorSettingsDrawer = () => {
  const { controller } = useOperatorLayoutContext();

  return (
    <Drawer
      title="Настройки очереди"
      width="min(460px, 100vw)"
      open={controller.isSettingsOpen}
      onClose={() => controller.setIsSettingsOpen(false)}
    >
      {controller.activeQueue ? (
        <QueueSettingsPanel
          queue={controller.activeQueue}
          loading={controller.settingsLoading}
          onSubmit={controller.onSubmitSettings}
          onOpenPoster={controller.onOpenPoster}
        />
      ) : null}
    </Drawer>
  );
};
