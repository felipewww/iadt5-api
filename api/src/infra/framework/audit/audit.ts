import { AuditRecord } from '@/infra/framework/audit/audit-record';
import {RemoteUser} from "@/infra/framework/context/remote-user";

export class Audit {
    // todo - tipar corretamente
    private Records: AuditRecord[] = []

    constructor(
        private readonly authUser: RemoteUser<any>, // todo - como tipar generico por cliente?
        private readonly traceId: string,
        private readonly uri: string,
        private readonly method: string,
        private readonly client: string,
    ) {
    }

    public record<T extends Record<any, any>>(
        meta: T,
        event: string, // todo - como tipar corretamente?
    ): void {
        const record: AuditRecord = {
            // _auditEntity: data,
            _auditEvent: event,
            meta,
            project: 'musa-agreements', // todo - como nomear isso generico? env var?
            client: 'web',
            traceId: this.traceId,
            user_id: this.authUser.id,
            user_name: this.authUser.username,
            uri: this.uri,
            method: this.method,
            created_at: new Date(),
        }

        this.Records.push(record)
    }

    get records() {
        return this.Records;
    }
}
