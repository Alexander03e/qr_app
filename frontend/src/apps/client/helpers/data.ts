// import type { QueueSnapshotResponse } from "@shared/entities/queue/types";
// import { getOrCreateDeviceId, type PersistedQueueSession } from "./session";

// export const prepareSessionData = (data: QueueSnapshotResponse): PersistedQueueSession | undefined => {
//     if (!data || !data.client_ticket) return
//     const queueId = data.queue_id
//     const ticketId = data.client_ticket.id!
//     const clientId = data.current_ticket!

//     return {
//         clientId: '',
//         deviceId: getOrCreateDeviceId(),
//         queueId: Number(queueId),
//         ticketId,
//     }
// }
