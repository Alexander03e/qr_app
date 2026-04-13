import { $api } from "@shared/api/axios";
import { OPERATOR_AUTH_TOKEN_STORAGE_KEY } from "@shared/consts";

interface OperatorProfile {
  id: number;
  fullname: string;
  email: string;
  role: string;
  branch: number | null;
  company: number | null;
}

export interface OperatorSessionResponse {
  operator: OperatorProfile;
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
