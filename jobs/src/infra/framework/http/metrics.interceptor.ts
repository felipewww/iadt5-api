import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from '@/infra/metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(private readonly metricsService: MetricsService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req   = context.switchToHttp().getRequest<Request>();
        const res   = context.switchToHttp().getResponse<Response>();
        const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                const route = (req.route?.path as string | undefined) ?? req.path;
                this.metricsService.record(req.method, route, res.statusCode, Date.now() - start);
            }),
            catchError((err) => {
                const route  = (req.route?.path as string | undefined) ?? req.path;
                const status = err instanceof HttpException ? err.getStatus() : 500;
                this.metricsService.record(req.method, route, status, Date.now() - start);
                return throwError(() => err);
            }),
        );
    }
}
