import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AUDIT_PARAMS_KEY } from '@/infra/framework/audit/auditable';
import { getRequestAdapter } from '@/infra/framework/http/get-request.adapter';

@Injectable()
export class GlobalInterceptor implements NestInterceptor {
    constructor(
        private reflector: Reflector
    ) {
    }

    private isAuditable(context: ExecutionContext) {
        const request = getRequestAdapter(context)
        let auditEvent: string;

        // se tiver audit apenas no endpoint....
        auditEvent = this.reflector.get<string>(AUDIT_PARAMS_KEY, context.getHandler());

        // se tiver audit global na controller
        if (!auditEvent) {
            auditEvent = this.reflector.get<string>(AUDIT_PARAMS_KEY, context.getClass());
        }

        if (
            (
                request.method === 'POST'
                || request.method === 'PUT'
                || request.method === 'PATCH'
                || request.method === 'DELETE'
            ) && auditEvent
        ) {
            return auditEvent;
        }
    }

    intercept(context: ExecutionContext, next: CallHandler) {
        const request = getRequestAdapter(context)
        const now = Date.now();
        request['_start'] = now;
        const method = request.method;
        const url = request.originalUrl ?? request.url;

        const auditEvent = this.isAuditable(context)

        if (auditEvent) {
            request.context?.audit.record({
                method,
                url,
                body: request.body,
                params: request.params,
            }, auditEvent)
        }

        return next.handle().pipe(
            map((value) => {
                if (request.context?.audit.records.length) {
                    // todo - corrigir publicação em exchange RabbitMQ
                    // this.sqsAudit.publish(request.context.audit.records);
                }

                return { data: value };
            }),
        );
    }
}
