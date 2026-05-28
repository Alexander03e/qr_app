import { $api } from "@shared/api/axios";
import type {
  NotificationStatusResponse,
  NotificationSubscriptionResponse,
  VkOAuthStartRequest,
  VkOAuthStartResponse,
  VkSubscribeRequest,
  WebPushPublicKeyResponse,
  WebPushSubscribeRequest,
  WebPushUnsubscribeRequest,
  WebPushUnsubscribeResponse,
} from "../types";

class NotificationsApi {
  async getWebPushPublicKey(): Promise<WebPushPublicKeyResponse> {
    return (await $api.get("/notifications/web-push/public-key/")).data;
  }

  async subscribeWebPush(
    payload: WebPushSubscribeRequest,
  ): Promise<NotificationSubscriptionResponse> {
    return (await $api.post("/notifications/web-push/subscribe/", payload)).data;
  }

  async unsubscribeWebPush(
    payload: WebPushUnsubscribeRequest,
  ): Promise<WebPushUnsubscribeResponse> {
    return (await $api.post("/notifications/web-push/unsubscribe/", payload))
      .data;
  }

  async subscribeVk(
    payload: VkSubscribeRequest,
  ): Promise<NotificationSubscriptionResponse> {
    return (await $api.post("/notifications/vk/subscribe/", payload)).data;
  }

  async startVkOAuth(
    payload: VkOAuthStartRequest,
  ): Promise<VkOAuthStartResponse> {
    return (await $api.post("/notifications/vk/oauth/start/", payload)).data;
  }

  async getStatus(params: {
    queue_id: number;
    client_id?: string | null;
    ticket_id?: number | null;
  }): Promise<NotificationStatusResponse> {
    return (await $api.get("/notifications/status/", { params })).data;
  }
}

export const notificationsApi = new NotificationsApi();
