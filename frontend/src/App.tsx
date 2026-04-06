import { ConfigProvider } from "antd";
import { AppRouter } from "./router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enUS from "antd/locale/en_US";
import ruRU from "antd/locale/ru_RU";
import { useTranslation } from "react-i18next";

function App() {
  const { i18n } = useTranslation();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
      },
    },
  });

  const antdLocale = i18n.resolvedLanguage?.startsWith("ru") ? ruRU : enUS;

  return (
    <ConfigProvider locale={antdLocale}>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
