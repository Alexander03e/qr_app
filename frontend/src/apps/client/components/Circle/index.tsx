import type { ReactNode } from "react";
import styles from "./Circle.module.scss";
import cn from "classnames";
import { Typography } from "antd";

interface IProps {
  title?: string;
  content?: ReactNode;
  variant?: "filled" | "outlined";
  onClick?: () => void;
}

export const Circle = ({
  content,
  title,
  variant = "outlined",
  onClick,
}: IProps) => {
  const isInteractive = typeof onClick === "function";

  return (
    <div
      className={cn(styles.wrapper, styles[variant], {
        [styles.interactive]: isInteractive,
      })}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isInteractive) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {title && (
        <Typography.Title level={2} className={styles.title}>
          {title}
        </Typography.Title>
      )}
      {content && <div className={styles.content}>{content}</div>}
    </div>
  );
};
