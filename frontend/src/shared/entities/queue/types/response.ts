import type { TicketStatus } from "./enum";

export interface QueueItemResponse {
  id: number;
  last_ticket_number: number;
  branch: number | null;
  name: string;
  language: "ru" | "en";
  notification_options: Record<string, unknown> | null;
  clients_limit: number | null;
  called_ticket_timeout_seconds: number | null;
  poster_title: string | null;
  poster_subtitle: string | null;
  queue_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketItemResponse {
  id: number;
  queue_name: string;
  status: TicketStatus;
  display_number: string;
  initial_ticket_number: number | null;
  enqueued_at: string;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  queue: number;
  client: number;
  operator: number | null;
}

export interface QueueBoardTicketResponse {
  id: number;
  display_number: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface QueueSnapshotResponse {
  queue_id: number;
  queue_name: string;
  queue_language: "ru" | "en";
  waiting_count: number;
  current_ticket: QueueBoardTicketResponse | null;
  waiting_tickets: QueueBoardTicketResponse[];
  client_ticket: TicketItemResponse | null;
  client_is_served: boolean;
  client_is_removed: boolean;
  client_is_not_arrived: boolean;
  client_called_remaining_seconds: number | null;
  called_ticket_timeout_seconds: number;
  estimated_wait_seconds: number | null;
}

export interface InviteNextResponse {
  ticket: TicketItemResponse | null;
  queue_snapshot: QueueSnapshotResponse;
}

export interface QueueDeleteTicketsResponse {
  queue_id: number;
  deleted_count: number;
  deleted_ticket_ids: number[];
}

export interface TicketStatusUpdateResponse {
  ticket: TicketItemResponse;
  queue_snapshot: QueueSnapshotResponse;
}

export interface AppendToQueueResponse {
  ticket: TicketItemResponse;
  queue_snapshot: QueueSnapshotResponse;
}
