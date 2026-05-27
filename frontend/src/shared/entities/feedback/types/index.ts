export type ClientFeedbackType = "FEEDBACK" | "COMPLAINT";
export type ClientFeedbackStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

export interface ClientFeedbackCreateRequest {
  queue_id: number;
  ticket_id?: number | null;
  type: ClientFeedbackType;
  title?: string;
  message: string;
  rating?: number | null;
}

export interface ClientFeedbackItemResponse {
  id: number;
  branch: number | null;
  queue: number | null;
  ticket: number | null;
  type: ClientFeedbackType;
  title: string;
  message: string;
  rating: number | null;
  status: ClientFeedbackStatus;
  created_at: string;
}
