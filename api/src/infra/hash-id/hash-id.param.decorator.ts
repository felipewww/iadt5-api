import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { HashIdService } from '@/infra/hash-id/hash-id.service';

const hashId = new HashIdService();

export const HashId = createParamDecorator((key: string, ctx: ExecutionContext): number => {
    const params = ctx.switchToHttp().getRequest<{ params: Record<string, unknown> }>().params;
    const value = params[key];
    if (typeof value !== 'string') throw new BadRequestException('ID inválido');
    try {
        return hashId.decode(value);
    } catch {
        throw new BadRequestException('ID inválido');
    }
});
