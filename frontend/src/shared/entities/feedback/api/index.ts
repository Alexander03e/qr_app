import { $api } from "@shared/api/axios";
import type {
  ClientFeedbackCreateRequest,
  ClientFeedbackItemResponse,
} from "../types";

class FeedbackApi {
  async createClientFeedback(
    payload: ClientFeedbackCreateRequest,
  ): Promise<ClientFeedbackItemResponse> {
    return (await $api.post("/feedback/", payload)).data;
  }
}

export const feedbackApi = new FeedbackApi();
