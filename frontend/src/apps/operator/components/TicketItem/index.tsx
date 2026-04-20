import { Button, Dropdown, Flex } from "antd";
import styles from "./TicketItem.module.scss";
import { MoreOutlined } from "@ant-design/icons";
import type { ComponentProps } from "react";
export interface IProps {
  index: number;
  ticketNumber: string;
  menu?: ComponentProps<typeof Dropdown>["menu"];
}

export const TicketItem = ({ index, ticketNumber, menu }: IProps) => {
  return (
    <Flex justify="space-between" className={styles.container}>
      <Flex align="center" gap={12}>
        <p className={styles.number}>{index}</p>
        <Flex className={styles.ticketNumber}>{ticketNumber}</Flex>
      </Flex>
      <Dropdown menu={menu}>
        <Button type="text" size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Flex>
  );
};
