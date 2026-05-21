import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';
import { HashIdService } from '@/infra/hash-id/hash-id.service';

@Injectable()
export class HashIdInterceptor implements NestInterceptor {
    constructor(private readonly hashId: HashIdService) {}

    intercept(_context: ExecutionContext, next: CallHandler) {
        return next.handle().pipe(map((data) => this.encodeIds(data)));
    }

    private encodeIds(data: unknown): unknown {
        if (data === null || data === undefined) return data;
        if (data instanceof Date) return data;
        if (Array.isArray(data)) return data.map((item) => this.encodeIds(item));
        if (typeof data === 'object') {
            const result: Record<string, unknown> = {};
            for (const key of Object.keys(data)) {
                const value = (data as Record<string, unknown>)[key];
                const isIdField = key === 'id' || key.endsWith('_id') || key.endsWith('Id');
                if (isIdField && typeof value === 'number') {
                    result[key] = this.hashId.encode(value);
                } else {
                    result[key] = this.encodeIds(value);
                }
            }
            return result;
        }
        return data;
    }
}
