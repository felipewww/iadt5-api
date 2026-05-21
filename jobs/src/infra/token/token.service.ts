import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface StreamTokenPayload extends JWTPayload {
    jobId: string;
    tenantId: string;
}

@Injectable()
export class TokenService {
    private get secret(): Uint8Array {
        const key = process.env.COGNITE_JOBS_SECRET;
        if (!key) throw new Error('COGNITE_JOBS_SECRET não configurado');
        return new TextEncoder().encode(key);
    }

    async sign(jobId: string, tenantId: string, expiresIn = '2h'): Promise<string> {
        return new SignJWT({ jobId, tenantId })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(this.secret);
    }

    async verify(token: string, expectedJobId: string): Promise<StreamTokenPayload> {
        try {
            const { payload } = await jwtVerify<StreamTokenPayload>(token, this.secret);

            if (payload.jobId !== expectedJobId) {
                throw new UnauthorizedException('Token não corresponde ao jobId solicitado');
            }

            return payload;
        } catch (err) {
            if (err instanceof UnauthorizedException) throw err;
            throw new UnauthorizedException('Token inválido ou expirado');
        }
    }
}
