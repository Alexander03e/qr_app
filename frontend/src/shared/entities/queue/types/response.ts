import type { TicketStatus } from "./enum";


export interface QueueItemResponse {
  id: number;
  last_ticket_number: number;
  branch: number | null;
  name: string;
  notification_options: Record<string, unknown> | null;
  clients_limit: number | null;
  queue_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketItemResponse {
  id: number;
  queue_name: string;
  status: TicketStatus;
  display_number: string;
  enqueued_at: string;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  queue: number;
  client: number;
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
  waiting_count: number;
  current_ticket: QueueBoardTicketResponse | null;
  waiting_tickets: QueueBoardTicketResponse[];
  client_ticket: TicketItemResponse | null;
  client_is_served: boolean;
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
