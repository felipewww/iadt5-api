export type AuditRecord = {
    _auditEvent: string,
    project: string,
    client: string,
    traceId: string,
    user_id: number,
    user_name: string,
    uri: string,
    method: string,
    created_at: Date,
    meta: Record<string, any>
};
