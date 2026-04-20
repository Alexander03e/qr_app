import type {
  FeedbackStatus,
  FeedbackType,
} from "@shared/entities/admin/types";

export interface OperatorFormValues {
  fullname: string;
  email: string;
  password?: string;
  branch?: number;
  preferred_language: "ru" | "en";
  queue_ids?: number[];
  is_active: boolean;
}

export interface QueueFormValues {
  branch: number;
  name: string;
  language: "ru" | "en";
  clients_limit?: number;
  called_ticket_timeout_seconds?: number;
  notification_options?: { channels: string[] };
  poster_title?: string;
  poster_subtitle?: string;
  queue_url?: string;
}

export interface FeedbackFormValues {
  branch?: number;
  queue?: number;
  type: FeedbackType;
  title: string;
  message: string;
  status: FeedbackStatus;
}

export interface CompanyFormValues {
  name: string;
  timezone: string;
}

export interface AdminSettingsFormValues {
  fullname: string;
  email: string;
  password?: string;
  preferred_language: "ru" | "en";
}

export interface OperatorLoadInfo {
  color: "default" | "success" | "processing" | "warning" | "error";
  label: string;
  waiting: number;
}
