import { QueueSettingsPanel } from "@shared/components";
import { Drawer } from "antd";
import { useOperatorLayoutContext } from "../context/useOperatorLayoutContext";

export const OperatorSettingsDrawer = () => {
  const { controller } = useOperatorLayoutContext();

  return (
    <Drawer
      title="Настройки очереди"
      width={460}
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
