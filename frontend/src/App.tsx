import { ConfigProvider } from "antd";
import { AppRouter } from "./router";
import { QueryClientProvider } from "@tanstack/react-query";
import enUS from "antd/locale/en_US";
import ruRU from "antd/locale/ru_RU";
import { useTranslation } from "react-i18next";
import { queryClient } from "@shared/api";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { APP_THEME } from "./theme";

function App() {
  const { i18n } = useTranslation();

  const antdLocale = i18n.resolvedLanguage?.startsWith("ru") ? ruRU : enUS;

  return (
    <ConfigProvider locale={antdLocale} theme={APP_THEME}>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <ReactQueryDevtools initialIsOpen />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
