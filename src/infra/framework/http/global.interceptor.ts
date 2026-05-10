import {
    CallHandler,
    ExecutionContext,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { catchError, finalize, map, throwError } from 'rxjs';
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

                return {
                    data: value,
                };
            }),
            catchError((err) => {
                Logger.error(err)

                if (err instanceof HttpException) {
                    const response = err.getResponse() as string | { message?: string | string[] };
                    let errors: string[] = [];

                    if (typeof response === 'string') {
                        errors = [response];
                    } else if (Array.isArray(response?.message)) {
                        errors = response.message.map((message) => String(message));
                    } else if (typeof response?.message === 'string') {
                        errors = [response.message];
                    } else if (err.message) {
                        errors = [err.message];
                    }

                    return throwError(() => {
                        return new HttpException(
                            {
                                ok: false,
                                duration: Date.now() - now,
                                error: err.message,
                                errors,
                            },
                            err.getStatus(),
                        );
                    });
                }

                // default = 500
                return throwError(() => {
                    return new InternalServerErrorException({
                        ok: false,
                        duration: Date.now() - now,
                        error: 'Internal Server Error.',
                    });
                });
            }),
            finalize(() => {
                // Logger.log(`${method} ${url} - ${Date.now() - now}ms`, GlobalInterceptor.name);
            }),
        );
    }
}
