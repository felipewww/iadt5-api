import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MetricsGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req           = context.switchToHttp().getRequest<Request>();
        const authorization = req.headers['authorization'];
        const token         = process.env.METRICS_TOKEN;

        if (!token) throw new UnauthorizedException();
        if (authorization !== `Bearer ${token}`) throw new UnauthorizedException();

        return true;
    }
}
