import { Button, Result, Typography, type ButtonProps } from "antd";
import styles from "./Error.module.scss";
import type { TAxiosApiError } from "@shared/api";
import { normalizeError } from "@shared/helper/normalizeError";
import type { ResultStatusType } from "antd/es/result";

interface IProps {
  error?: TAxiosApiError;
  title?: string;
  text?: string;
  button?: ButtonProps;
  isNormalizeError?: boolean;
}
export const Error = ({
  title,
  error,
  text,
  button,
  isNormalizeError = true,
}: IProps) => {
  const errorMessage = isNormalizeError
    ? normalizeError(error)
    : error?.message;

  let errorStatus: ResultStatusType = "error";

  if (error) {
    switch (error.status) {
      case 404:
      case 403:
      case 500:
        errorStatus = error.status.toString() as ResultStatusType;
        break;
      default:
        break;
    }
  }
  return (
    <div className={styles.wrapper}>
      <Result status={errorStatus}>
        {title ||
          (errorMessage && (
            <Typography.Title className={styles.title} level={5}>
              {title || errorMessage}
            </Typography.Title>
          ))}
        {text && (
          <Typography.Text className={styles.text}>{text}</Typography.Text>
        )}
      </Result>
      {button && <Button {...button} />}
    </div>
  );
};
