export const PATHS = {
  CLIENT: "/c",
  OPERATOR: "/o",
  ADMIN: "/a",
};

export const POLLING_INTERVAL_MS = 1000;

export const CLIENT_DEVICE_ID_STORAGE_KEY = "client_device_id";
export const CLIENT_QUEUE_SESSION_KEY = "client_queue_session";
export const CLIENT_QUEUE_TOKEN_STORAGE_KEY = "client_queue_token";
export const CLIENT_LANG_STORAGE_KEY = "client_lang";
export const OPERATOR_AUTH_TOKEN_STORAGE_KEY = "operator_auth_token";
export const ADMIN_AUTH_TOKEN_STORAGE_KEY = "admin_auth_token";
export const CLIENT_CALLED_TIMEOUT_SECONDS = 5 * 60;

export const buildRouterPath = (base: string, path: string) => {
  return `${base}/${path}`;
};
