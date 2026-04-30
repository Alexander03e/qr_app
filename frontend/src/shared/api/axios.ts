import axios from "axios";
import {
  ADMIN_AUTH_TOKEN_STORAGE_KEY,
  OPERATOR_AUTH_TOKEN_STORAGE_KEY,
} from "@shared/consts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export const $api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const resolveAuthTokenByPath = (url?: string): string | null => {
  const adminToken = localStorage.getItem(ADMIN_AUTH_TOKEN_STORAGE_KEY);
  const operatorToken = localStorage.getItem(OPERATOR_AUTH_TOKEN_STORAGE_KEY);

  if (!url) {
    return operatorToken ?? adminToken;
  }

  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  if (
    normalizedUrl.startsWith("/auth/operator/") ||
    normalizedUrl.startsWith("/operator/")
  ) {
    return operatorToken;
  }

  if (
    normalizedUrl.startsWith("/auth/admin/") ||
    normalizedUrl.startsWith("/admin/")
  ) {
    return adminToken;
  }

  return operatorToken ?? adminToken;
};

$api.interceptors.request.use((config) => {
  const token = resolveAuthTokenByPath(config.url);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});
