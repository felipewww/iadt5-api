import { Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';
import { RequestContext } from '@/infra/framework/context/request-context';
import { NotificationTokenOutput } from '@/domain/dtos/notifications/outputs/notification-token.output';
import { manifest } from '@/infra/manifest/manifest';

@Injectable()
export class GetNotificationTokenHandler {
    async execute(ctx: RequestContext): Promise<NotificationTokenOutput> {
        const secret = new TextEncoder().encode(process.env.NOTIFICATIONS_SECRET);
        const token = await new SignJWT({ sub: String(ctx.user.id), tenantId: manifest.uid })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('1h')
            .sign(secret);
        return NotificationTokenOutput.from(token);
    }
}
