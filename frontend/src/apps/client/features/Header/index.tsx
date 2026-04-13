import { HomeFilled } from "@ant-design/icons";
import { useQueueStore } from "@apps/client/store";
import { readClientLanguage, writeClientLanguage } from "@apps/client/helpers";
import { queuesApi } from "@shared/entities/queue/api";
import { Flex, Select, Typography } from "antd";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./Header.module.scss";
export const Header = () => {
  const { queueData, clientId } = useQueueStore();
  const { i18n } = useTranslation();

  const { mutate: persistLanguage } = useMutation({
    mutationFn: (language: "ru" | "en") => {
      if (!clientId) {
        return Promise.resolve();
      }

      return queuesApi.updateClientLanguage(clientId, language);
    },
  });

  useEffect(() => {
    const savedLanguage = readClientLanguage();
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
      return;
    }

    if (queueData?.queue_language) {
      i18n.changeLanguage(queueData.queue_language);
    }
  }, [i18n, queueData?.queue_language]);

  if (!queueData) {
    return <div className={styles.wrapper} />;
  }
  return (
    <Flex className={styles.wrapper}>
      <HomeFilled />
      <Typography>{queueData?.queue_name}</Typography>
      <Select
        size="small"
        value={i18n.language.startsWith("en") ? "en" : "ru"}
        options={[
          { label: "RU", value: "ru" },
          { label: "EN", value: "en" },
        ]}
        onChange={(value: "ru" | "en") => {
          i18n.changeLanguage(value);
          writeClientLanguage(value);
          persistLanguage(value);
        }}
      />
    </Flex>
  );
};
