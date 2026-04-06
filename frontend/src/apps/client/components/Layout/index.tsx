import { Outlet } from "react-router-dom";
import styles from "./Layout.module.scss";
import type { ReactNode } from "react";

export interface IProps {
  topSlot?: ReactNode;
  children?: ReactNode;
}

export const Layout = ({ topSlot, children }: IProps) => {
  return (
    <div className={styles.layout}>
      {topSlot}
      {children}
      <Outlet />
    </div>
  );
};
