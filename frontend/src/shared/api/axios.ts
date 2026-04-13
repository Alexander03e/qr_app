import axios from "axios";
import {
  ADMIN_AUTH_TOKEN_STORAGE_KEY,
  OPERATOR_AUTH_TOKEN_STORAGE_KEY,
} from "@shared/consts";

const API_URL = "http://localhost:8000/api/v1";

export const $api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

$api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem(ADMIN_AUTH_TOKEN_STORAGE_KEY) ??
    localStorage.getItem(OPERATOR_AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
