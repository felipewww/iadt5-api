export type NotificationMessage = {
    userId: number;
    type: string;
    title: string;
    message?: Record<string, unknown>;
};
