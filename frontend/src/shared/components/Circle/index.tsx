import type { ComponentProps, ReactNode } from "react";
import styles from "./Circle.module.scss";
import cn from "classnames";
import { Progress, Typography } from "antd";

interface IProps {
  title?: string | ReactNode;
  children?: ReactNode;
  variant?: "filled" | "outlined";
  onClick?: () => void;
  className?: string;
  contentClassName?: string;
  isProgress?: boolean;
  progressProps?: ComponentProps<typeof Progress>;
  color?: "default" | "success";
}

export const Circle = ({
  children,
  title,
  variant = "outlined",
  contentClassName,
  className,
  isProgress = true,
  progressProps,
  onClick,
  color = "default",
}: IProps) => {
  const isInteractive = typeof onClick === "function";

  if (isProgress) {
    const strokeColor =
      (progressProps?.strokeColor ?? color === "success")
        ? "var(--success-color)"
        : "var(--primary-color)";
    return (
      <Progress
        {...progressProps}
        strokeColor={strokeColor}
        className={cn(styles.progress, progressProps?.className, className)}
        type="circle"
        format={() => (
          <div className={cn(styles.content, contentClassName)}>{children}</div>
        )}
      />
    );
  }

  return (
    <div
      className={cn(styles.wrapper, className, styles[variant], {
        [styles.interactive]: isInteractive,
        [styles.isProgress]: isProgress,
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
      {children && (
        <div className={cn(styles.content, contentClassName)}>{children}</div>
      )}
    </div>
  );
};
