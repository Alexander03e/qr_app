import { Layout } from "antd";
import type { ReactNode } from "react";
import { Header } from "@apps/operator/features/Header";

import { OperatorEmptyState } from "./components/OperatorEmptyState";
import { OperatorSettingsDrawer } from "./components/OperatorSettingsDrawer";
import { OperatorSidebar } from "./components/OperatorSidebar";
import { useOperatorLayoutContext } from "./context/useOperatorLayoutContext";
import styles from "./OperatorLayout.module.scss";

interface OperatorLayoutProps {
  children: ReactNode;
}

export const OperatorLayout = ({ children }: OperatorLayoutProps) => {
  const { controller } = useOperatorLayoutContext();

  if (!controller.queues.length) {
    return <OperatorEmptyState />;
  }

  return (
    <Layout className={styles.layout}>
      <OperatorSidebar />

      <Layout>
        <Header />

        <Layout.Content className={styles.content}>{children}</Layout.Content>
      </Layout>

      <OperatorSettingsDrawer />
    </Layout>
  );
};
