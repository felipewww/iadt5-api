import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { logHttpError } from '@/infra/framework/http/http-error-logger';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(err: unknown, host: ArgumentsHost): void {
        const ctx      = host.switchToHttp();
        const req      = ctx.getRequest<Request & { _start?: number }>();
        const res      = ctx.getResponse<Response>();
        const duration = req._start ? Date.now() - req._start : 0;

        const status =
            err instanceof HttpException
                ? err.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        logHttpError(err, req.method, req.originalUrl ?? req.url, duration);

        if (err instanceof HttpException) {
            const raw = err.getResponse() as string | Record<string, unknown>;
            let errors: string[] = [];

            if (typeof raw === 'string') {
                errors = [raw];
            } else if (Array.isArray(raw?.message)) {
                errors = (raw.message as unknown[]).map(String);
            } else if (typeof raw?.message === 'string') {
                errors = [raw.message];
            } else if (err.message) {
                errors = [err.message];
            }

            res.status(status).json({ ok: false, duration, error: err.message, errors });
            return;
        }

        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            ok: false,
            duration,
            error: 'Internal Server Error.',
        });
    }
}
