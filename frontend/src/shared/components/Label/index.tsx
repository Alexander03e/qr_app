import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Label.module.scss";
import cn from "classnames";
interface IProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "success";
}
export const Label = ({
  className,
  children,
  variant = "default",
  ...props
}: IProps) => {
  return (
    <div className={cn(styles.label, className, styles[variant])} {...props}>
      {children}
    </div>
  );
};
