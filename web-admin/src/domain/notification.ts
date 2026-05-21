export type JobDoneMessage   = { text: string; jobId: string }
export type JobFailedMessage = { text: string; jobId: string }
export type AlertMessage     = { text: string }
export type InfoMessage      = { text: string }

export type AppNotification =
    | { type: 'job.done';   title: string; message?: JobDoneMessage;   receivedAt: Date }
    | { type: 'job.failed'; title: string; message?: JobFailedMessage; receivedAt: Date }
    | { type: 'alert';      title: string; message?: AlertMessage;     receivedAt: Date }
    | { type: 'info';       title: string; message?: InfoMessage;      receivedAt: Date }
