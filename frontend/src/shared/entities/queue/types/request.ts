export interface QueueListRequest {
  branch?: number;
}

export interface CreateQueueRequest {
  last_ticket_number?: number;
  branch?: number | null;
  name: string;
  language?: "ru" | "en";
  notification_options?: Record<string, unknown> | null;
  clients_limit?: number | null;
  called_ticket_timeout_seconds?: number | null;
  poster_title?: string | null;
  poster_subtitle?: string | null;
  queue_url?: string | null;
}

export type UpdateQueueRequest = Partial<CreateQueueRequest>;

export interface QueueJoinClientRequest {
  name?: string | null;
  vk_id?: string | null;
  device_id?: string | null;
  queue_token?: string | null;
  preferred_lang?: string | null;
  phone?: string | null;
  send_notification?: boolean;
  consent_ad?: boolean;
}

export interface JoinQueueRequest {
  queue_id: number;
  client_id?: string;
  queue_token?: string;
  client?: QueueJoinClientRequest;
}

export interface InviteByIdRequest {
  action?: "complete" | "return";
}

export interface QueueDeleteTicketsRequest {
  ticket_ids: number[];
}

export interface QueueTicketListRequest {
  queue?: number;
}
