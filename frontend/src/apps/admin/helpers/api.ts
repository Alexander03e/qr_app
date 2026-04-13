import { $api } from "@shared/api/axios";

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

class AdminApi {
  async getCompanies(): Promise<AdminCompany[]> {
    return (await $api.get("/admin/companies/")).data;
  }

  async updateCompany(
    companyId: number,
    payload: {
      name?: string;
      timezone?: string;
    }
  ): Promise<AdminCompany> {
    return (await $api.patch(`/admin/companies/${companyId}/`, payload)).data;
  }

  async getBranches(company?: number): Promise<AdminBranch[]> {
    return (
      await $api.get("/admin/branches/", {
        params: company ? { company } : undefined,
      })
    ).data;
  }

  async createBranch(payload: {
    company: number;
    name: string;
    address: string;
    is_active: boolean;
    work_schedule_json: Record<string, string>;
  }): Promise<AdminBranch> {
    return (await $api.post("/admin/branches/", payload)).data;
  }

  async getQueues(branch?: number): Promise<AdminQueue[]> {
    return (
      await $api.get("/admin/queues/", {
        params: branch ? { branch } : undefined,
      })
    ).data;
  }

  async getQueueById(queueId: number): Promise<AdminQueue> {
    return (await $api.get(`/admin/queues/${queueId}/`)).data;
  }

  async createQueue(payload: {
    branch: number;
    name: string;
    language?: "ru" | "en";
    notification_options?: { channels: string[] };
    clients_limit?: number;
    called_ticket_timeout_seconds?: number | null;
    poster_title?: string | null;
    poster_subtitle?: string | null;
    queue_url?: string;
  }): Promise<AdminQueue> {
    return (
      await $api.post("/admin/queues/", {
        ...payload,
        notification_options: payload.notification_options ?? {},
      })
    ).data;
  }

  async updateQueue(
    queueId: number,
    payload: {
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
  ): Promise<AdminQueue> {
    return (await $api.patch(`/admin/queues/${queueId}/`, payload)).data;
  }

  async deleteQueue(queueId: number): Promise<void> {
    await $api.delete(`/admin/queues/${queueId}/`);
  }

  async getOperators(branch?: number): Promise<AdminOperator[]> {
    return (
      await $api.get("/admin/operators/", {
        params: branch ? { branch } : undefined,
      })
    ).data;
  }

  async createOperator(payload: {
    fullname: string;
    email: string;
    password: string;
    branch?: number;
    preferred_language?: "ru" | "en";
    queue_ids?: number[];
    is_active: boolean;
  }): Promise<AdminOperator> {
    return (await $api.post("/admin/operators/", payload)).data;
  }

  async updateOperator(
    operatorId: number,
    payload: {
      fullname?: string;
      email?: string;
      password?: string;
      branch?: number | null;
      preferred_language?: "ru" | "en";
      queue_ids?: number[];
      is_active?: boolean;
    }
  ): Promise<AdminOperator> {
    return (await $api.patch(`/admin/operators/${operatorId}/`, payload)).data;
  }

  async deleteOperator(operatorId: number): Promise<void> {
    await $api.delete(`/admin/operators/${operatorId}/`);
  }

  async getFeedback(): Promise<AdminFeedbackItem[]> {
    return (await $api.get("/admin/feedback/")).data;
  }

  async createFeedback(payload: {
    branch?: number | null;
    queue?: number | null;
    type: FeedbackType;
    title: string;
    message: string;
    status?: FeedbackStatus;
  }): Promise<AdminFeedbackItem> {
    return (await $api.post("/admin/feedback/", payload)).data;
  }

  async updateFeedback(
    feedbackId: number,
    payload: {
      branch?: number | null;
      queue?: number | null;
      type?: FeedbackType;
      title?: string;
      message?: string;
      status?: FeedbackStatus;
    }
  ): Promise<AdminFeedbackItem> {
    return (await $api.patch(`/admin/feedback/${feedbackId}/`, payload)).data;
  }

  async deleteFeedback(feedbackId: number): Promise<void> {
    await $api.delete(`/admin/feedback/${feedbackId}/`);
  }

  async getMetrics(): Promise<AdminMetrics> {
    return (await $api.get("/admin/metrics/")).data;
  }

  async getQueueSnapshot(queueId: number): Promise<AdminQueueSnapshot> {
    return (await $api.get(`/queues/${queueId}/snapshot/`)).data;
  }

  async updateAdminSettings(payload: {
    fullname?: string;
    email?: string;
    password?: string;
    preferred_language?: "ru" | "en";
  }): Promise<{ admin: AdminProfileSettings }> {
    return (await $api.patch("/auth/admin/settings/", payload)).data;
  }
}

export const adminApi = new AdminApi();
