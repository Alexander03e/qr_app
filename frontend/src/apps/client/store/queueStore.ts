import { create } from "zustand";
import type {
  QueueSnapshotResponse,
  TicketItemResponse,
} from "@shared/entities/queue/types";

interface QueueStoreState {
  clientId: string | null;
  queueId: number | null;
  isServed: boolean;
  isNotArrived: boolean;
  queueData: QueueSnapshotResponse | null;
  ticket: TicketItemResponse | null;
  isInQueue: boolean;
  setClientId: (clientId: string | null) => void;
  setQueueId: (queueId: number | null) => void;
  setQueue: (queueSnapshot: QueueSnapshotResponse | null) => void;
  setTicket: (ticket: TicketItemResponse | null) => void;
  setIsInQueue: (isInQueue: boolean) => void;
  resetQueueState: () => void;
  setIsServed: (isServed: boolean) => void;
  setIsNotArrived: (isNotArrived: boolean) => void;
}

const initialState = {
  clientId: null,
  queueId: null,
  queueData: null,
  ticket: null,
  isInQueue: false,
  isServed: false,
  isNotArrived: false,
};

export const useQueueStore = create<QueueStoreState>()((set) => ({
  ...initialState,
  setClientId: (clientId) => set({ clientId }),
  setQueueId: (queueId) => set({ queueId }),
  setQueue: (queueData) => set({ queueData }),
  setTicket: (ticket) => set({ ticket }),
  setIsInQueue: (isInQueue) => set({ isInQueue }),
  resetQueueState: () => set(initialState),
  setIsServed: (isServed) => set({ isServed }),
  setIsNotArrived: (isNotArrived) => set({ isNotArrived }),
}));
