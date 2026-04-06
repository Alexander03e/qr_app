import { $api } from "@shared/api/axios";
import type {
    AppendToQueueResponse,
    CreateQueueRequest,
    InviteNextResponse,
    JoinQueueRequest,
    QueueDeleteTicketsRequest,
    QueueDeleteTicketsResponse,
    QueueItemResponse,
    QueueListRequest,
    QueueSnapshotResponse,
    QueueTicketListRequest,
    TicketItemResponse,
    TicketStatus,
    TicketStatusUpdateResponse,
    UpdateQueueRequest,
} from "@shared/entities/queue/types";

class QueuesApi {
    async getQueues(params?: QueueListRequest): Promise<QueueItemResponse[]> {
        return (await $api.get("/queues/", { params })).data;
    }

    async getQueueById(queueId: number): Promise<QueueItemResponse> {
        return (await $api.get(`/queues/${queueId}/`)).data;
    }

    async createQueue(payload: CreateQueueRequest): Promise<QueueItemResponse> {
        return (await $api.post("/queues/", payload)).data;
    }

    async updateQueue(queueId: number, payload: UpdateQueueRequest): Promise<QueueItemResponse> {
        return (await $api.patch(`/queues/${queueId}/`, payload)).data;
    }

    async deleteQueue(queueId: number): Promise<void> {
        await $api.delete(`/queues/${queueId}/`);
    }

    async getQueueSnapshot(queueId: number | string): Promise<QueueSnapshotResponse> {
        return (await $api.get(`/queues/${queueId}/snapshot/`)).data;
    }

    async inviteNext(queueId: number): Promise<InviteNextResponse> {
        return (await $api.post(`/queues/${queueId}/invite-next/`)).data;
    }

    async deleteTicketsFromQueue(
        queueId: number,
        payload: QueueDeleteTicketsRequest,
    ): Promise<QueueDeleteTicketsResponse> {
        return (await $api.post(`/queues/${queueId}/tickets/delete/`, payload)).data;
    }

    async getTickets(params?: QueueTicketListRequest): Promise<TicketItemResponse[]> {
        return (await $api.get("/tickets/", { params })).data;
    }

    async getTicketById(ticketId: number): Promise<TicketItemResponse> {
        return (await $api.get(`/tickets/${ticketId}/`)).data;
    }

    async joinQueue(payload: JoinQueueRequest): Promise<TicketItemResponse> {
        return (await $api.post("/tickets/join/", payload)).data;
    }

    async updateTicketStatus(
        ticketId: number,
        status: TicketStatus,
    ): Promise<TicketStatusUpdateResponse> {
        return (await $api.patch(`/tickets/${ticketId}/status/`, { status })).data;
    }

    async appendToQueue(ticketId: number): Promise<AppendToQueueResponse> {
        return (await $api.post(`/tickets/${ticketId}/append-to-queue/`)).data;
    }
}

export const queuesApi = new QueuesApi();