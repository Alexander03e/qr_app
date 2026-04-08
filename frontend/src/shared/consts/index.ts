export const PATHS = {
    CLIENT: "/c",
    OPERATOR: "/o",
    ADMIN: "/a"
}

export const POLLING_INTERVAL_MS = 1000;

export const CLIENT_DEVICE_ID_STORAGE_KEY = "client_device_id";
export const CLIENT_QUEUE_SESSION_KEY = "client_queue_session";

export const buildRouterPath = (base: string, path: string) => {
    return `${base}/${path}`;
}