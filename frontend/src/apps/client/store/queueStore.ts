import { create } from "zustand";
import type { QueueSnapshotResponse, TicketItemResponse } from "@shared/entities/queue/types";

interface QueueStoreState {
  queueId: number | null;
  queueData: QueueSnapshotResponse | null;
  ticket: TicketItemResponse | null;
  isInQueue: boolean;
  setQueueId: (queueId: number | null) => void;
  setQueue: (queueSnapshot: QueueSnapshotResponse | null) => void;
  setTicket: (ticket: TicketItemResponse | null) => void;
  setIsInQueue: (isInQueue: boolean) => void;
  resetQueueState: () => void;
}

const initialState = {
  queueId: null,
  queueData: null,
  ticket: null,
  isInQueue: false,
};

export const useQueueStore = create<QueueStoreState>()((set) => ({
  ...initialState,
  setQueueId: (queueId) => set({ queueId }),
  setQueue: (queueData) => set({ queueData }),
  setTicket: (ticket) => set({ ticket }),
  setIsInQueue: (isInQueue) => set({ isInQueue }),
  resetQueueState: () => set(initialState),
}));
