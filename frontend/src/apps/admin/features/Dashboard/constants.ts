import type { FeedbackStatus, FeedbackType } from "@shared/entities/admin/types";

export const feedbackStatusColors: Record<FeedbackStatus, string> = {
  NEW: "default",
  IN_PROGRESS: "processing",
  RESOLVED: "success",
};

export const feedbackTypeColors: Record<FeedbackType, string> = {
  FEEDBACK: "blue",
  COMPLAINT: "volcano",
};
