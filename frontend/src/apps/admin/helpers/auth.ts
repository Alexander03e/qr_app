import { $api } from "@shared/api/axios";
import { ADMIN_AUTH_TOKEN_STORAGE_KEY } from "@shared/consts";

export interface AdminProfile {
  id: number;
  fullname: string;
  email: string;
  role: string;
  branch: number | null;
  company: number | null;
}

interface AdminSessionResponse {
  admin: AdminProfile;
}

interface AdminLoginResponse {
  token: string;
  expires_at: string;
  admin: AdminProfile;
}

export const adminAuth = {
  async login(email: string, password: string): Promise<AdminLoginResponse> {
    return (await $api.post("/auth/admin/login/", { email, password })).data;
  },

  async me(): Promise<AdminSessionResponse> {
    return (await $api.get("/auth/admin/me/")).data;
  },

  async logout(): Promise<void> {
    await $api.post("/auth/admin/logout/");
  },

  readToken(): string | null {
    return localStorage.getItem(ADMIN_AUTH_TOKEN_STORAGE_KEY);
  },

  writeToken(token: string): void {
    localStorage.setItem(ADMIN_AUTH_TOKEN_STORAGE_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(ADMIN_AUTH_TOKEN_STORAGE_KEY);
  },
};
