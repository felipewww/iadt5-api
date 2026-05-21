import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';
import { getRequestAdapter } from '@/infra/framework/http/get-request.adapter';

@Injectable()
export class GlobalInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler) {
        const request = getRequestAdapter(context);
        request['_start'] = Date.now();

        return next.handle().pipe(
            map((value) => ({ data: value })),
        );
    }
}
