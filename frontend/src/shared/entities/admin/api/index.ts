import { $api } from "@shared/api/axios";
import type {
  AdminBranch,
  AdminCompany,
  AdminCreateBranchPayload,
  AdminCreateFeedbackPayload,
  AdminCreateOperatorPayload,
  AdminCreateQueuePayload,
  AdminFeedbackItem,
  AdminMetrics,
  AdminMetricsFilters,
  AdminOperator,
  AdminQueue,
  AdminQueueSnapshot,
  AdminUpdateBranchPayload,
  AdminUpdateCompanyPayload,
  AdminUpdateFeedbackPayload,
  AdminUpdateOperatorPayload,
  AdminUpdateQueuePayload,
  AdminUpdateSettingsPayload,
  AdminUpdateSettingsResponse,
} from "@shared/entities/admin/types";

class AdminApi {
  async getCompanies(): Promise<AdminCompany[]> {
    return (await $api.get("/admin/companies/")).data;
  }

  async updateCompany(
    companyId: number,
    payload: AdminUpdateCompanyPayload,
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

  async createBranch(payload: AdminCreateBranchPayload): Promise<AdminBranch> {
    return (await $api.post("/admin/branches/", payload)).data;
  }

  async updateBranch(
    branchId: number,
    payload: AdminUpdateBranchPayload,
  ): Promise<AdminBranch> {
    return (await $api.patch(`/admin/branches/${branchId}/`, payload)).data;
  }

  async deleteBranch(branchId: number): Promise<void> {
    await $api.delete(`/admin/branches/${branchId}/`);
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

  async createQueue(payload: AdminCreateQueuePayload): Promise<AdminQueue> {
    return (
      await $api.post("/admin/queues/", {
        ...payload,
        notification_options: payload.notification_options ?? {},
      })
    ).data;
  }

  async updateQueue(
    queueId: number,
    payload: AdminUpdateQueuePayload,
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

  async createOperator(payload: AdminCreateOperatorPayload): Promise<AdminOperator> {
    return (await $api.post("/admin/operators/", payload)).data;
  }

  async updateOperator(
    operatorId: number,
    payload: AdminUpdateOperatorPayload,
  ): Promise<AdminOperator> {
    return (await $api.patch(`/admin/operators/${operatorId}/`, payload)).data;
  }

  async deleteOperator(operatorId: number): Promise<void> {
    await $api.delete(`/admin/operators/${operatorId}/`);
  }

  async getFeedback(): Promise<AdminFeedbackItem[]> {
    return (await $api.get("/admin/feedback/")).data;
  }

  async createFeedback(payload: AdminCreateFeedbackPayload): Promise<AdminFeedbackItem> {
    return (await $api.post("/admin/feedback/", payload)).data;
  }

  async updateFeedback(
    feedbackId: number,
    payload: AdminUpdateFeedbackPayload,
  ): Promise<AdminFeedbackItem> {
    return (await $api.patch(`/admin/feedback/${feedbackId}/`, payload)).data;
  }

  async deleteFeedback(feedbackId: number): Promise<void> {
    await $api.delete(`/admin/feedback/${feedbackId}/`);
  }

  async getMetrics(filters?: AdminMetricsFilters): Promise<AdminMetrics> {
    return (
      await $api.get("/admin/metrics/", {
        params: filters,
      })
    ).data;
  }

  async getQueueSnapshot(queueId: number): Promise<AdminQueueSnapshot> {
    return (await $api.get(`/queues/${queueId}/snapshot/`)).data;
  }

  async updateAdminSettings(
    payload: AdminUpdateSettingsPayload,
  ): Promise<AdminUpdateSettingsResponse> {
    return (await $api.patch("/auth/admin/settings/", payload)).data;
  }
}

export const adminApi = new AdminApi();
