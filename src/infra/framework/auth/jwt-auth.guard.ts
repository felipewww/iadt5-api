import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import { IS_PUBLIC_KEY } from '@/infra/framework/auth/public.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
import { getRequestAdapter } from '@/infra/framework/http/get-request.adapter';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const req = getRequestAdapter(context);
        const authorization = req.headers['authorization'];

        if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException();

        const token = authorization.substring(7);
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);

        try {
            const { payload } = await jwtVerify(token, secret);
            req.context = new RequestContext(
                {
                    id: Number(payload.sub),
                    username: payload['username'] as string,
                    name: payload['name'] as string,
                    groups: payload['groups'] as number[],
                    metadata: {},
                },
                req.headers['x-trace-id'] as string,
                req.path,
                req.method,
                (req.headers['x-client'] as string) ?? 'web',
            );
        } catch {
            throw new UnauthorizedException();
        }

        return true;
    }
}
