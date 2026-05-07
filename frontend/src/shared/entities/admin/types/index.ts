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

export interface AdminCreateBranchPayload {
  company: number;
  name: string;
  address: string;
  is_active: boolean;
  work_schedule_json: Record<string, unknown>;
}

export interface AdminUpdateBranchPayload {
  company?: number;
  name?: string;
  address?: string;
  is_active?: boolean;
  work_schedule_json?: Record<string, unknown>;
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
  ticket: number | null;
  type: FeedbackType;
  title: string;
  message: string;
  rating: number | null;
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
  error_rate_percent: number;
  avg_latency_ms: number;
  endpoints: Array<{
    method: string;
    endpoint: string;
    requests: number;
    error_requests: number;
    error_rate_percent: number;
    avg_latency_ms: number;
  }>;
  business: {
    total_tickets: number;
    active_tickets: number;
    processed_tickets: number;
    waiting_tickets: number;
    called_tickets: number;
    in_service_tickets: number;
    completed_tickets: number;
    skipped_tickets: number;
    not_arrived_tickets: number;
    left_tickets: number;
    removed_tickets: number;
    avg_wait_seconds: number;
    max_wait_seconds: number;
    avg_service_seconds: number;
    avg_initial_queue_position: number;
    sla_wait_under_10_min_percent: number;
    completion_rate_percent: number;
    left_rate_percent: number;
    not_arrived_rate_percent: number;
    removed_rate_percent: number;
    load_percent: number;
    load_per_operator: number;
    active_operator_count: number;
    throughput_per_hour: number;
    feedback_count: number;
    complaints_count: number;
    complaint_rate_percent: number;
    avg_rating: number;
    rating_count: number;
    branches: Array<{
      branch_id: number;
      branch_name: string;
      queue_count: number;
      total_tickets: number;
      active_tickets: number;
      processed_tickets: number;
      waiting_tickets: number;
      called_tickets: number;
      in_service_tickets: number;
      completed_tickets: number;
      skipped_tickets: number;
      not_arrived_tickets: number;
      left_tickets: number;
      removed_tickets: number;
      avg_wait_seconds: number;
      max_wait_seconds: number;
      avg_service_seconds: number;
      avg_initial_queue_position: number;
      sla_wait_under_10_min_percent: number;
      completion_rate_percent: number;
      left_rate_percent: number;
      not_arrived_rate_percent: number;
      removed_rate_percent: number;
      load_percent: number;
      load_per_operator: number;
      active_operator_count: number;
      throughput_per_hour: number;
      feedback_count: number;
      complaints_count: number;
      complaint_rate_percent: number;
      avg_rating: number;
      rating_count: number;
    }>;
    queues: Array<{
      queue_id: number;
      queue_name: string;
      branch_id: number | null;
      branch_name: string | null;
      total_tickets: number;
      active_tickets: number;
      processed_tickets: number;
      waiting_tickets: number;
      called_tickets: number;
      in_service_tickets: number;
      completed_tickets: number;
      skipped_tickets: number;
      not_arrived_tickets: number;
      left_tickets: number;
      removed_tickets: number;
      avg_wait_seconds: number;
      max_wait_seconds: number;
      avg_service_seconds: number;
      avg_initial_queue_position: number;
      sla_wait_under_10_min_percent: number;
      completion_rate_percent: number;
      left_rate_percent: number;
      not_arrived_rate_percent: number;
      removed_rate_percent: number;
      load_percent: number;
      load_per_operator: number;
      active_operator_count: number;
      throughput_per_hour: number;
      feedback_count: number;
      complaints_count: number;
      complaint_rate_percent: number;
      avg_rating: number;
      rating_count: number;
    }>;
    peak_hours: Array<{
      hour: number;
      tickets: number;
    }>;
    operators: Array<{
      operator_id: number;
      operator_name: string;
      branch_id: number | null;
      branch_name: string | null;
      is_active: boolean;
      queue_count: number;
      total_tickets: number;
      waiting_tickets: number;
      active_tickets: number;
      processed_tickets: number;
      called_tickets: number;
      in_service_tickets: number;
      completed_tickets: number;
      skipped_tickets: number;
      not_arrived_tickets: number;
      left_tickets: number;
      removed_tickets: number;
      avg_wait_seconds: number;
      max_wait_seconds: number;
      avg_service_seconds: number;
      avg_initial_queue_position: number;
      sla_wait_under_10_min_percent: number;
      completion_rate_percent: number;
      left_rate_percent: number;
      not_arrived_rate_percent: number;
      removed_rate_percent: number;
      load_percent: number;
      load_per_operator: number;
      active_operator_count: number;
      throughput_per_hour: number;
      feedback_count: number;
      complaints_count: number;
      complaint_rate_percent: number;
      avg_rating: number;
      rating_count: number;
    }>;
    daily: Array<{
      date: string;
      total_tickets: number;
      completed_tickets: number;
      left_tickets: number;
      not_arrived_tickets: number;
      avg_wait_seconds: number;
      avg_service_seconds: number;
    }>;
  };
}

export interface AdminMetricsFilters {
  branch_id?: number;
  queue_id?: number;
  operator_id?: number;
  date_from?: string;
  date_to?: string;
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
  ticket?: number | null;
  type: FeedbackType;
  title: string;
  message: string;
  rating?: number | null;
  status?: FeedbackStatus;
}

export interface AdminUpdateFeedbackPayload {
  branch?: number | null;
  queue?: number | null;
  ticket?: number | null;
  type?: FeedbackType;
  title?: string;
  message?: string;
  rating?: number | null;
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
