export interface AdminCompany {
  id: number;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AdminBranch {
  id: number;
  company: number;
  name: string;
  address: string;
  is_active: boolean;
  work_schedule_json: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface AdminQueue {
  id: number;
  branch: number | null;
  name: string;
  language: "ru" | "en";
  notification_options: Record<string, unknown>;
  clients_limit: number | null;
  called_ticket_timeout_seconds: number | null;
  poster_title: string | null;
  poster_subtitle: string | null;
  queue_url: string | null;
  created_at: string;
  updated_at: string;
  last_ticket_number: number;
}

export interface AdminOperatorQueueSummary {
  id: number;
  name: string;
}

export interface AdminOperator {
  id: number;
  fullname: string;
  email: string;
  role: string;
  is_active: boolean;
  preferred_language: "ru" | "en";
  company: number | null;
  branch: number | null;
  queues: AdminOperatorQueueSummary[];
  created_at: string;
  updated_at: string;
}

export type FeedbackType = "FEEDBACK" | "COMPLAINT";
export type FeedbackStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

export interface AdminFeedbackItem {
  id: number;
  company: number;
  branch: number | null;
  queue: number | null;
  type: FeedbackType;
  title: string;
  message: string;
  status: FeedbackStatus;
  resolved_by_user: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminMetrics {
  company_id: number;
  total_requests: number;
  error_requests: number;
  avg_latency_ms: number;
  endpoints: Array<{
    method: string;
    endpoint: string;
    requests: number;
  }>;
}

export interface AdminQueueSnapshot {
  queue_id: number;
  waiting_count: number;
}

export interface AdminProfileSettings {
  id: number;
  fullname: string;
  email: string;
  role: string;
  branch: number | null;
  company: number | null;
  preferred_language: "ru" | "en";
}

export interface AdminUpdateSettingsResponse {
  admin: AdminProfileSettings;
}

export interface AdminCreateOperatorPayload {
  fullname: string;
  email: string;
  password: string;
  branch?: number;
  preferred_language?: "ru" | "en";
  queue_ids?: number[];
  is_active: boolean;
}

export interface AdminUpdateOperatorPayload {
  fullname?: string;
  email?: string;
  password?: string;
  branch?: number | null;
  preferred_language?: "ru" | "en";
  queue_ids?: number[];
  is_active?: boolean;
}

export interface AdminCreateQueuePayload {
  branch: number;
  name: string;
  language?: "ru" | "en";
  notification_options?: { channels: string[] };
  clients_limit?: number;
  called_ticket_timeout_seconds?: number | null;
  poster_title?: string | null;
  poster_subtitle?: string | null;
  queue_url?: string;
}

export interface AdminUpdateQueuePayload {
  branch?: number;
  name?: string;
  language?: "ru" | "en";
  notification_options?: { channels: string[] };
  clients_limit?: number | null;
  called_ticket_timeout_seconds?: number | null;
  poster_title?: string | null;
  poster_subtitle?: string | null;
  queue_url?: string | null;
}

export interface AdminCreateFeedbackPayload {
  branch?: number | null;
  queue?: number | null;
  type: FeedbackType;
  title: string;
  message: string;
  status?: FeedbackStatus;
}

export interface AdminUpdateFeedbackPayload {
  branch?: number | null;
  queue?: number | null;
  type?: FeedbackType;
  title?: string;
  message?: string;
  status?: FeedbackStatus;
}

export interface AdminUpdateCompanyPayload {
  name?: string;
  timezone?: string;
}

export interface AdminUpdateSettingsPayload {
  fullname?: string;
  email?: string;
  password?: string;
  preferred_language?: "ru" | "en";
}
