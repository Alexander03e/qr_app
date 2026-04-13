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
  notification_options: Record<string, unknown>;
  clients_limit: number | null;
  queue_url: string | null;
  created_at: string;
  updated_at: string;
  last_ticket_number: number;
}

export interface AdminOperator {
  id: number;
  fullname: string;
  email: string;
  role: string;
  is_active: boolean;
  company: number | null;
  branch: number | null;
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

export interface AdminProfileSettings {
  id: number;
  fullname: string;
  email: string;
  role: string;
  branch: number | null;
  company: number | null;
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

  async createQueue(payload: {
    branch: number;
    name: string;
    clients_limit?: number;
    queue_url?: string;
  }): Promise<AdminQueue> {
    return (
      await $api.post("/admin/queues/", {
        ...payload,
        notification_options: {},
      })
    ).data;
  }

  async updateQueue(
    queueId: number,
    payload: {
      branch?: number;
      name?: string;
      clients_limit?: number | null;
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

  async updateAdminSettings(payload: {
    fullname?: string;
    email?: string;
    password?: string;
  }): Promise<{ admin: AdminProfileSettings }> {
    return (await $api.patch("/auth/admin/settings/", payload)).data;
  }
}

export const adminApi = new AdminApi();
