import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';

@Injectable()
export class GlobalInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler) {
        return next.handle().pipe(map((value) => ({ data: value })));
    }
}
