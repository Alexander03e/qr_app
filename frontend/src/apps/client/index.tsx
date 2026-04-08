import { HomePage } from "./pages/HomePage";
import { GuestPage } from "./pages/GuestPage";
import { Layout } from "./components/Layout";
import { Header } from "./features";
import { useQueueStore } from "./store/queueStore";
import { Outlet, Route, Routes } from "react-router-dom";
import { LoadingOutlined } from "@ant-design/icons";
import { LeftPage } from "./pages/LeftPage";
import { Spin } from "antd";
import { ClientAuthProvider } from "./features/ClientAuthProvider";
import { useAppStore } from "./store/appStore";
import { WithError } from "./features/WithError";

export const ClientAppInner = () => {
  const { isInQueue: inQueueState, queueData } = useQueueStore();
  const { isLoading } = useAppStore();
  const isUserInQueue = inQueueState;

  if (isLoading || !queueData) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  if (isUserInQueue) {
    return <HomePage />;
  }

  return <GuestPage />;
};

export const ClientApp = () => {
  return (
    <Routes>
      <Route
        path="/:queueId"
        element={
          <ClientAuthProvider>
            <Layout topSlot={<Header />}>
              <WithError>
                <Outlet />
              </WithError>
            </Layout>
          </ClientAuthProvider>
        }
      >
        <Route element={<ClientAppInner />} index />
        <Route path="left" element={<LeftPage />} />
      </Route>
    </Routes>
  );
};
