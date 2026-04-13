import { $api } from "@shared/api/axios";
import { OPERATOR_AUTH_TOKEN_STORAGE_KEY } from "@shared/consts";

interface OperatorProfile {
  id: number;
  fullname: string;
  email: string;
  role: string;
  branch: number | null;
  company: number | null;
  preferred_language: "ru" | "en";
  queue_ids: number[];
}

export interface OperatorSessionResponse {
  operator: OperatorProfile;
}

export interface OperatorQueue {
  id: number;
  branch: number | null;
  name: string;
  language: "ru" | "en";
  notification_options: { channels?: string[] } | null;
  clients_limit: number | null;
  called_ticket_timeout_seconds: number | null;
  poster_title: string | null;
  poster_subtitle: string | null;
  queue_url: string | null;
  created_at: string;
  updated_at: string;
  last_ticket_number: number;
}

interface OperatorLoginResponse {
  token: string;
  expires_at: string;
  operator: OperatorProfile;
}

export const operatorAuth = {
  async login(email: string, password: string): Promise<OperatorLoginResponse> {
    return (await $api.post("/auth/operator/login/", { email, password })).data;
  },

  async me(): Promise<OperatorSessionResponse> {
    return (await $api.get("/auth/operator/me/")).data;
  },

  async logout(): Promise<void> {
    await $api.post("/auth/operator/logout/");
  },

  async updateSettings(payload: {
    preferred_language?: "ru" | "en";
  }): Promise<OperatorSessionResponse> {
    return (await $api.patch("/auth/operator/settings/", payload)).data;
  },

  async getQueues(): Promise<OperatorQueue[]> {
    return (await $api.get("/operator/queues/")).data;
  },

  async updateQueueSettings(
    queueId: number,
    payload: Partial<
      Pick<
        OperatorQueue,
        | "name"
        | "language"
        | "clients_limit"
        | "called_ticket_timeout_seconds"
        | "queue_url"
        | "poster_title"
        | "poster_subtitle"
      >
    > & {
      notification_options?: { channels: string[] };
    }
  ): Promise<OperatorQueue> {
    return (await $api.patch(`/operator/queues/${queueId}/settings/`, payload))
      .data;
  },

  readToken(): string | null {
    return localStorage.getItem(OPERATOR_AUTH_TOKEN_STORAGE_KEY);
  },

  writeToken(token: string): void {
    localStorage.setItem(OPERATOR_AUTH_TOKEN_STORAGE_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(OPERATOR_AUTH_TOKEN_STORAGE_KEY);
  },
};
