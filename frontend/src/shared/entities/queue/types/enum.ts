export const TICKET_STATUS = {
    WAITING: "WAITING",
    CALLED: "CALLED",
    SKIPPED: "SKIPPED",
    COMPLETED: "COMPLETED",
    LEFT: "LEFT",
    IN_SERVICE: "IN_SERVICE",
    NOT_ARRIVED: "NOT_ARRIVED",
} as const


export type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS];
