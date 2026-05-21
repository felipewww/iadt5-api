import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import { IS_PUBLIC_KEY } from '@/infra/framework/auth/public.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
import { getRequestAdapter } from '@/infra/framework/http/get-request.adapter';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authSecretService: AuthSecretService,
    ) {}

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

        try {
            const { payload } = await jwtVerify(token, this.authSecretService.buildAccessSecret());
            req.context = new RequestContext(
                {
                    id: Number(payload.sub),
                    username: payload['username'] as string,
                    name: payload['name'] as string,
                    acs: (payload['acs'] as string[]) ?? [],
                    root: (payload['root'] as boolean) ?? false,
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
