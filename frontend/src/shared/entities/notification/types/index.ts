export interface WebPushPublicKeyResponse {
  public_key: string | null;
  configured: boolean;
}

export interface BrowserPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface WebPushSubscribeRequest {
  queue_id: number;
  client_id?: string | null;
  ticket_id?: number | null;
  subscription: BrowserPushSubscriptionPayload;
}

export interface WebPushUnsubscribeRequest {
  queue_id: number;
  client_id?: string | null;
  ticket_id?: number | null;
  endpoint?: string | null;
}

export interface WebPushUnsubscribeResponse {
  disabled_count: number;
}

export interface VkSubscribeRequest {
  queue_id: number;
  client_id?: string | null;
  ticket_id?: number | null;
  vk_id: string;
}

export interface VkOAuthStartRequest {
  queue_id: number;
  client_id?: string | null;
  ticket_id?: number | null;
}

export interface VkOAuthStartResponse {
  configured: boolean;
  auth_url: string | null;
  bot_url: string | null;
}

export interface NotificationSubscriptionResponse {
  id: number;
  client: number;
  queue: number;
  channel: "WEB_PUSH" | "VK";
  vk_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationStatusResponse {
  web_push_enabled: boolean;
  vk_enabled: boolean;
  subscriptions: NotificationSubscriptionResponse[];
}
